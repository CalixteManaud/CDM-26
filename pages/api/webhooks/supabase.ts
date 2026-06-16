import type { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'crypto';
import { clerkClient } from '@clerk/nextjs/server';
import type { UserRole } from '@/prisma/prisma-client/enums';

/** Comparaison en temps constant du secret (évite un timing oracle). */
function secretMatches(provided: unknown, expected: string): boolean {
  if (typeof provided !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Webhook Supabase → Clerk
 *
 * Reçoit les événements Database Webhooks Supabase sur la table `User` et
 * propage les modifications vers Clerk. Couvre la direction DB → Clerk
 * (la direction Clerk → DB est gérée par /api/webhooks/clerk.ts via svix).
 *
 * Champs synchronisés :
 *   - username   → Clerk.username + publicMetadata.username
 *   - name       → Clerk.firstName / lastName (split au premier espace)
 *   - avatar     → Clerk.imageUrl (best-effort, certains plans Clerk refusent)
 *   - role       → Clerk.publicMetadata.role
 *
 * Champs NON synchronisés :
 *   - email           : Clerk owns (les emails se gèrent via Clerk Dashboard)
 *   - twitchUsername  : sourcé par Clerk OAuth, géré par le webhook Clerk
 *   - twitchUserId    : idem
 *
 * Anti-loop :
 *   1. On compare le payload Supabase avec l'état Clerk actuel avant chaque push.
 *   2. Si aucun champ ne diffère, on no-op → la chaîne s'arrête naturellement.
 *
 * Setup côté Supabase :
 *   Dashboard Supabase > Database > Webhooks > Create a new hook
 *     - Table:    public.User
 *     - Events:   UPDATE, DELETE
 *     - URL:      https://ton-domaine.com/api/webhooks/supabase
 *     - Method:   POST
 *     - Headers:  x-supabase-webhook-secret = <même valeur que SUPABASE_WEBHOOK_SECRET>
 *   (Pas besoin d'INSERT — les users sont créés par Clerk via /api/webhooks/clerk.)
 */

type SupabaseUserRow = {
  id: string;
  clerkId: string | null;
  email: string | null;
  name: string | null;
  username: string | null;
  avatar: string | null;
  role: UserRole | null;
};

type SupabasePayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: SupabaseUserRow | null;
  old_record: SupabaseUserRow | null;
};

function splitName(name: string | null): { firstName: string | null; lastName: string | null } {
  if (!name) return { firstName: null, lastName: null };
  const trimmed = name.trim();
  if (!trimmed) return { firstName: null, lastName: null };
  const firstSpace = trimmed.indexOf(' ');
  if (firstSpace === -1) return { firstName: trimmed, lastName: null };
  return {
    firstName: trimmed.slice(0, firstSpace),
    lastName: trimmed.slice(firstSpace + 1).trim() || null,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SECRET = process.env.SUPABASE_WEBHOOK_SECRET;
  if (!SECRET) {
    console.error('[supabase webhook] SUPABASE_WEBHOOK_SECRET is not defined');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const provided = req.headers['x-supabase-webhook-secret'];
  if (!secretMatches(provided, SECRET)) {
    return res.status(401).json({ error: 'Invalid secret' });
  }

  const payload = req.body as SupabasePayload;

  if (!payload || payload.table !== 'User') {
    return res.status(200).json({ skipped: 'not User table' });
  }

  // INSERT — ne devrait pas arriver en pratique. Les users sont créés
  // par Clerk → webhook Clerk → DB. Un INSERT direct dans Supabase Studio
  // n'a pas de clerkId valide, donc rien à push.
  if (payload.type === 'INSERT') {
    return res.status(200).json({ skipped: 'INSERT ignored' });
  }

  const client = typeof clerkClient === 'function' ? await clerkClient() : clerkClient;

  if (payload.type === 'DELETE') {
    const oldRow = payload.old_record;
    if (!oldRow?.clerkId) {
      return res.status(200).json({ skipped: 'no clerkId in old_record' });
    }
    try {
      await client.users.deleteUser(oldRow.clerkId);
      console.log(`✅ [supabase webhook] Clerk user deleted: ${oldRow.clerkId}`);
    } catch (error) {
      // Clerk peut déjà avoir delete (cas où la suppression vient de Clerk lui-même
      // et le webhook Clerk a déjà supprimé en DB — pas de loop puisque l'user
      // Clerk n'existe plus). On log et on continue.
      console.warn(`[supabase webhook] Clerk deleteUser failed for ${oldRow.clerkId}:`, error);
    }
    return res.status(200).json({ ok: true });
  }

  if (payload.type === 'UPDATE') {
    const row = payload.record;
    const oldRow = payload.old_record;
    if (!row?.clerkId) {
      return res.status(200).json({ skipped: 'no clerkId in record' });
    }

    // Détection des champs qui ont changé en DB. Si aucun champ pertinent
    // n'a changé (ex: seul updatedAt diffère), on no-op.
    const changed = {
      username: oldRow?.username !== row.username,
      name: oldRow?.name !== row.name,
      avatar: oldRow?.avatar !== row.avatar,
      role: oldRow?.role !== row.role,
    };
    if (!Object.values(changed).some(Boolean)) {
      return res.status(200).json({ skipped: 'no relevant field changed' });
    }

    // Anti-loop final : on lit l'état Clerk actuel et on ne push que les
    // champs qui diffèrent vraiment. Si le webhook Clerk vient juste de
    // synchro la DB, les valeurs sont identiques → no-op.
    let clerkUser;
    try {
      clerkUser = await client.users.getUser(row.clerkId);
    } catch (error) {
      console.error(`[supabase webhook] Clerk getUser failed for ${row.clerkId}:`, error);
      return res.status(500).json({ error: 'Failed to fetch Clerk user' });
    }

    const userUpdates: { username?: string; firstName?: string; lastName?: string } = {};

    if (changed.username && row.username !== clerkUser.username) {
      if (row.username) userUpdates.username = row.username;
    }

    if (changed.name) {
      const { firstName, lastName } = splitName(row.name);
      if (firstName !== null && firstName !== clerkUser.firstName) {
        userUpdates.firstName = firstName;
      }
      if (lastName !== null && lastName !== clerkUser.lastName) {
        userUpdates.lastName = lastName;
      }
    }

    if (Object.keys(userUpdates).length > 0) {
      try {
        await client.users.updateUser(row.clerkId, userUpdates);
      } catch (error) {
        console.error(`[supabase webhook] Clerk updateUser failed for ${row.clerkId}:`, error);
      }
    }

    // Avatar : Clerk's Backend SDK n'a pas de champ direct sur updateUser pour
    // imageUrl. On tente via updateUserProfileImage si dispo, sinon on log
    // un warning — l'avatar côté DB reste la source d'affichage UI.
    if (changed.avatar && row.avatar && row.avatar !== clerkUser.imageUrl) {
      try {
        const updateFn = (
          client.users as unknown as {
            updateUserProfileImage?: (id: string, params: { file: string }) => Promise<unknown>;
          }
        ).updateUserProfileImage;
        if (typeof updateFn === 'function') {
          await updateFn.call(client.users, row.clerkId, { file: row.avatar });
        } else {
          console.warn(
            `[supabase webhook] Avatar update non supporté côté Clerk SDK. DB reste source de vérité pour ${row.clerkId}.`
          );
        }
      } catch (error) {
        console.warn(`[supabase webhook] Clerk avatar sync failed for ${row.clerkId}:`, error);
      }
    }

    // Role + username dans publicMetadata pour accès client-side (useUser().publicMetadata).
    const currentMetaRole = (clerkUser.publicMetadata as Record<string, unknown>)?.role;
    const currentMetaUsername = (clerkUser.publicMetadata as Record<string, unknown>)?.username;
    const needsMetaSync =
      (changed.role && currentMetaRole !== row.role) ||
      (changed.username && currentMetaUsername !== row.username);

    if (needsMetaSync) {
      try {
        await client.users.updateUserMetadata(row.clerkId, {
          publicMetadata: {
            ...clerkUser.publicMetadata,
            role: row.role,
            username: row.username,
          },
        });
      } catch (error) {
        console.error(
          `[supabase webhook] Clerk updateUserMetadata failed for ${row.clerkId}:`,
          error
        );
      }
    }

    console.log(`✅ [supabase webhook] User synced to Clerk: ${row.clerkId}`);
    return res.status(200).json({ ok: true, changed });
  }

  return res.status(200).json({ skipped: 'unknown type' });
}
