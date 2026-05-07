import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import prisma from '@/lib/prisma';
import { isValidTwitchUsername, normalizeTwitchUsername } from '@/lib/wizebot';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const dbUser = await syncClerkUserById(userId);
    if (!dbUser) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    const { username, avatar, twitchUsername } = req.body;

    // Validate username
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Pseudo manquant' });
    }

    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      return res.status(400).json({ error: 'Le pseudo doit faire entre 3 et 20 caractères' });
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      return res.status(400).json({
        error: 'Le pseudo ne peut contenir que des lettres, chiffres, tirets et underscores',
      });
    }

    // Check if username is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        username: trimmedUsername,
        NOT: {
          id: dbUser.id,
        },
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Ce pseudo est déjà pris' });
    }

    // twitchUsername — TROIS états distincts :
    //   undefined : champ pas dans la requête → ne PAS toucher la DB
    //   '' / null : effacement explicite
    //   string    : nouveau username à valider
    //
    // Règle additionnelle : si l'utilisateur a un twitchUserId (= lié via OAuth Clerk),
    // on REFUSE les modifications manuelles. Le lien est géré par le webhook Clerk.
    const twitchProvided = Object.prototype.hasOwnProperty.call(req.body, 'twitchUsername');
    const writeTwitchUsername =
      twitchProvided &&
      (typeof twitchUsername === 'string' || twitchUsername === null);

    let normalizedTwitch: string | null = null;
    if (writeTwitchUsername) {
      if (dbUser.twitchUserId) {
        return res.status(400).json({
          error:
            'Ton compte Twitch est lié via OAuth. Délie-le depuis tes paramètres Clerk pour le modifier.',
        });
      }
      if (typeof twitchUsername === 'string' && twitchUsername.trim().length > 0) {
        normalizedTwitch = normalizeTwitchUsername(twitchUsername);
        if (!isValidTwitchUsername(normalizedTwitch)) {
          return res.status(400).json({
            error:
              'Username Twitch invalide. 4 à 25 caractères, lettres / chiffres / underscores uniquement.',
          });
        }
        const twitchTaken = await prisma.user.findFirst({
          where: {
            twitchUsername: normalizedTwitch,
            NOT: { id: dbUser.id },
          },
          select: { id: true },
        });
        if (twitchTaken) {
          return res
            .status(400)
            .json({ error: 'Ce username Twitch est déjà lié à un autre compte CDM 26.' });
        }
      }
      // Sinon (string vide / null) → normalizedTwitch reste à null = effacement
    }

    // Update user profile in database
    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        username: trimmedUsername,
        avatar: avatar || null,
        ...(writeTwitchUsername ? { twitchUsername: normalizedTwitch } : {}),
      },
    });

    // Sync with Clerk - update username, avatar, and publicMetadata
    try {
      const client = typeof clerkClient === 'function' ? await clerkClient() : clerkClient;
      await client.users.updateUser(userId, {
        username: trimmedUsername,
        ...(avatar && { imageUrl: avatar }),
      });
      // Also update publicMetadata for client-side access
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          username: trimmedUsername,
          role: dbUser.role, // Keep role in sync
        },
      });
    } catch (clerkError) {
      console.error('Error syncing with Clerk:', clerkError);
      // Don't fail the request if Clerk sync fails
      // The database is updated, which is the source of truth
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
