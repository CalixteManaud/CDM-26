import { currentUser, getAuth, clerkClient } from '@clerk/nextjs/server';
import { UserRole } from '../prisma/prisma-client/client';
import prisma from './prisma';

type AuthRequest = Parameters<typeof getAuth>[0];

/**
 * Représente un OAuth Twitch lié à un User Clerk.
 * Source de vérité: ce que Clerk renvoie via externalAccounts ou external_accounts.
 */
export type TwitchOAuthLink = {
  username: string; // login Twitch normalisé en lowercase
  providerUserId: string; // ID Twitch immuable
};

const TWITCH_PROVIDER_KEYS = ['oauth_twitch', 'twitch'] as const;

function isTwitchProvider(provider: unknown): boolean {
  if (typeof provider !== 'string') return false;
  return TWITCH_PROVIDER_KEYS.includes(provider as (typeof TWITCH_PROVIDER_KEYS)[number]);
}

/**
 * Extrait l'OAuth Twitch depuis un objet user Clerk côté SDK (camelCase).
 * Retourne null si le user n'a pas lié Twitch.
 */
export function extractTwitchFromClerkUser(user: {
  externalAccounts?: ReadonlyArray<{
    provider?: string | null;
    providerUserId?: string | null;
    username?: string | null;
  }> | null;
}): TwitchOAuthLink | null {
  const accounts = user.externalAccounts ?? [];
  const twitch = accounts.find((a) => isTwitchProvider(a?.provider));
  if (!twitch || !twitch.username || !twitch.providerUserId) return null;
  return {
    username: twitch.username.toLowerCase().trim(),
    providerUserId: twitch.providerUserId,
  };
}

/**
 * Variante pour le payload brut des webhooks Clerk (snake_case).
 */
export function extractTwitchFromClerkWebhook(data: {
  external_accounts?: ReadonlyArray<{
    provider?: string | null;
    provider_user_id?: string | null;
    username?: string | null;
  }> | null;
}): TwitchOAuthLink | null {
  const accounts = data.external_accounts ?? [];
  const twitch = accounts.find((a) => isTwitchProvider(a?.provider));
  if (!twitch || !twitch.username || !twitch.provider_user_id) return null;
  return {
    username: twitch.username.toLowerCase().trim(),
    providerUserId: twitch.provider_user_id,
  };
}

/**
 * Met à jour twitchUsername / twitchUserId sur un User en gérant les conflits
 * (si un autre user a déjà ce username — peu probable car Twitch est unique).
 */
async function safeApplyTwitchLink(
  userId: string,
  twitch: TwitchOAuthLink | null
): Promise<void> {
  if (!twitch) {
    // Pas de Twitch lié côté Clerk — on ne touche PAS aux champs DB.
    // (Si l'utilisateur les a remplis manuellement, on garde sa saisie.
    //  Si on veut "nettoyer" sur unlink, ça se ferait via un webhook
    //  externalAccount.deleted, hors scope ici.)
    return;
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        twitchUsername: twitch.username,
        twitchUserId: twitch.providerUserId,
      },
    });
  } catch (err) {
    // P2002 = unique constraint conflict → un autre user a déjà ce
    // twitchUsername (ou twitchUserId). On log et on essaie d'écrire
    // au moins le providerUserId, qui est plus fiable.
    const code = (err as { code?: string })?.code;
    if (code === 'P2002') {
      console.warn(
        `[clerk:twitch-sync] Conflit unique pour @${twitch.username} (user ${userId}). Skip.`
      );
      return;
    }
    throw err;
  }
}

/**
 * Helper pour synchroniser un utilisateur Clerk avec la DB
 * Gère le cas où l'email existe déjà avec un clerkId différent (switch Dev/Prod)
 */
async function upsertUserFromClerk(
  clerkId: string,
  email: string,
  name: string,
  username: string | null,
  avatar: string | null,
  twitch: TwitchOAuthLink | null = null
) {
  // Chercher l'utilisateur par clerkId d'abord
  let dbUser = await prisma.user.findUnique({
    where: { clerkId },
  });

  // Si pas trouvé par clerkId, chercher par email (cas de switch Dev/Prod)
  if (!dbUser && email) {
    dbUser = await prisma.user.findUnique({
      where: { email },
    });

    // Si trouvé par email, mettre à jour le clerkId
    if (dbUser) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          clerkId,
          name,
          username,
          avatar,
        },
      });
      await safeApplyTwitchLink(dbUser.id, twitch);
      return dbUser;
    }
  }

  // Si toujours pas trouvé, créer un nouvel utilisateur
  if (!dbUser && email) {
    dbUser = await prisma.user.create({
      data: {
        clerkId,
        email,
        name,
        username,
        avatar,
        role: UserRole.GUEST,
      },
    });
    await safeApplyTwitchLink(dbUser.id, twitch);
  } else if (dbUser) {
    // Mettre à jour les infos si l'utilisateur existe
    dbUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        email,
        name,
        username,
        avatar,
      },
    });
    await safeApplyTwitchLink(dbUser.id, twitch);
  }

  return dbUser;
}

/**
 * Synchronise un utilisateur Clerk avec la base de données (pour Server Actions)
 * Crée ou met à jour l'utilisateur dans Prisma
 * Utilise currentUser() - pour App Router et Server Actions uniquement
 */
export async function syncClerkUser() {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User';
  const username = user.username || null;
  const avatar = user.imageUrl || null;
  const twitch = extractTwitchFromClerkUser(user);

  // Utiliser la fonction helper pour gérer les conflits Dev/Prod
  const dbUser = await upsertUserFromClerk(user.id, email, name, username, avatar, twitch);

  if (!dbUser) return null;

  // Sync role and username to Clerk publicMetadata for client-side access
  const needsMetadataUpdate =
    user.publicMetadata?.role !== dbUser.role ||
    user.publicMetadata?.username !== dbUser.username;

  if (needsMetadataUpdate) {
    try {
      const client = typeof clerkClient === 'function' ? await clerkClient() : clerkClient;
      await client.users.updateUserMetadata(user.id, {
        publicMetadata: {
          role: dbUser.role,
          username: dbUser.username,
        },
      });
    } catch (error) {
      console.error('Error syncing metadata to Clerk:', error);
    }
  }

  return dbUser;
}

/**
 * Synchronise un utilisateur Clerk avec la base de données (pour getServerSideProps)
 * Utilise getAuth(req) - pour Pages Router uniquement
 */
export async function syncClerkUserFromReq(req: AuthRequest) {
  const { userId } = getAuth(req);

  if (!userId) {
    return null;
  }

  const client = typeof clerkClient === 'function' ? await clerkClient() : clerkClient;
  const user = await client.users.getUser(userId);

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User';
  const username = user.username || null;
  const avatar = user.imageUrl || null;
  const twitch = extractTwitchFromClerkUser(user);

  // Utiliser la fonction helper pour gérer les conflits Dev/Prod
  const dbUser = await upsertUserFromClerk(user.id, email, name, username, avatar, twitch);

  if (!dbUser) return null;

  // Sync role and username to Clerk publicMetadata for client-side access
  const needsMetadataUpdate =
    user.publicMetadata?.role !== dbUser.role ||
    user.publicMetadata?.username !== dbUser.username;

  if (needsMetadataUpdate) {
    try {
      const client = typeof clerkClient === 'function' ? await clerkClient() : clerkClient;
      await client.users.updateUserMetadata(user.id, {
        publicMetadata: {
          role: dbUser.role,
          username: dbUser.username,
        },
      });
    } catch (error) {
      console.error('Error syncing metadata to Clerk:', error);
    }
  }

  return dbUser;
}

/**
 * Récupère l'utilisateur DB depuis l'ID Clerk
 */
export async function getDbUserFromClerk(clerkUserId: string) {
  return await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
  });
}

/**
 * Synchronise un utilisateur Clerk avec la base de données en utilisant le userId
 * Compatible avec Pages Router (API Routes)
 */
export async function syncClerkUserById(userId: string) {
  if (!userId) {
    return null;
  }

  const client = typeof clerkClient === 'function' ? await clerkClient() : clerkClient;
  const user = await client.users.getUser(userId);

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User';
  const username = user.username || null;
  const avatar = user.imageUrl || null;
  const twitch = extractTwitchFromClerkUser(user);

  // Utiliser la fonction helper pour gérer les conflits Dev/Prod
  const dbUser = await upsertUserFromClerk(user.id, email, name, username, avatar, twitch);

  if (!dbUser) return null;

  // Sync role and username to Clerk publicMetadata for client-side access
  const needsMetadataUpdate =
    user.publicMetadata?.role !== dbUser.role ||
    user.publicMetadata?.username !== dbUser.username;

  if (needsMetadataUpdate) {
    try {
      const client = typeof clerkClient === 'function' ? await clerkClient() : clerkClient;
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          role: dbUser.role,
          username: dbUser.username,
        },
      });
    } catch (error) {
      console.error('Error syncing metadata to Clerk:', error);
    }
  }

  return dbUser;
}

/**
 * Récupère les informations complètes de l'utilisateur (pour getServerSideProps)
 * Équivalent SSR de getCurrentUserInfo()
 */
export async function getUserInfoFromReq(req: AuthRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return null;
  }

  const client = typeof clerkClient === 'function' ? await clerkClient() : clerkClient;
  const clerkUser = await client.users.getUser(userId);

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: {
      coachedTeams: {
        include: {
          tournament: true,
          group: true,
          _count: {
            select: { players: true },
          },
        },
      },
      players: {
        include: {
          team: {
            include: {
              tournament: true,
            },
          },
        },
      },
    },
  });

  return dbUser;
}

/**
 * Vérifie si l'utilisateur actuel est admin
 */
export async function isAdmin(): Promise<boolean> {
  const dbUser = await syncClerkUser();
  return dbUser?.role === UserRole.ADMIN;
}

/**
 * Vérifie si l'utilisateur actuel a un rôle spécifique
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const dbUser = await syncClerkUser();
  return dbUser?.role === role;
}
