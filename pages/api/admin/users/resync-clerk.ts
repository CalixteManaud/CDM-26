import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { isSiteAdmin } from '@/lib/utils/permissions';
import prisma from '@/lib/prisma';

/**
 * Force-pousse les champs DB → Clerk publicMetadata pour un user donné
 * (role + username). Utile après une modif manuelle en base (Supabase Studio,
 * SQL direct…) qui ne déclenche aucun webhook.
 *
 * Body: { targetUserId?: string }   (DB id ; si absent → self)
 * Auth: ADMIN en DB. Pour le cas où tu viens de te promouvoir toi-même
 *       en SQL, le check lit le rôle en DB donc ça marche immédiatement.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const caller = await syncClerkUserById(userId);
    if (!caller) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    const admin = await isSiteAdmin(caller.id);
    if (!admin) {
      return res.status(403).json({ error: 'Permissions insuffisantes' });
    }

    const targetDbId =
      typeof req.body?.targetUserId === 'string' && req.body.targetUserId.length > 0
        ? req.body.targetUserId
        : caller.id;

    const target = await prisma.user.findUnique({
      where: { id: targetDbId },
      select: { id: true, clerkId: true, role: true, username: true, email: true },
    });

    if (!target) {
      return res.status(404).json({ error: 'Utilisateur cible introuvable' });
    }

    const client = typeof clerkClient === 'function' ? await clerkClient() : clerkClient;
    await client.users.updateUserMetadata(target.clerkId, {
      publicMetadata: {
        role: target.role,
        username: target.username,
      },
    });

    return res.status(200).json({
      success: true,
      target: {
        id: target.id,
        email: target.email,
        role: target.role,
        username: target.username,
      },
      hint:
        target.id === caller.id
          ? 'Déconnecte-toi puis reconnecte-toi pour rafraîchir ton JWT côté client.'
          : 'Le user cible verra le nouveau rôle au prochain refresh de session.',
    });
  } catch (error) {
    console.error('Error resyncing Clerk metadata:', error);
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    return res.status(500).json({ error: message });
  }
}
