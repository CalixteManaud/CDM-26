import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import prisma from '@/lib/prisma';

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

    if (dbUser.role !== 'GUEST') {
      return res.status(400).json({ error: 'Vous êtes déjà participant ou administrateur' });
    }

    // Pseudo de joueur — distinct du compte Twitch (qui reste utilisé pour
    // les paris). Si l'utilisateur n'en saisit pas, on garde celui déjà en DB
    // (peut venir de Clerk au signup).
    const { username } = req.body ?? {};
    const provided = typeof username === 'string' && username.trim().length > 0;
    const trimmed = provided ? username.trim() : null;

    if (provided && trimmed) {
      if (trimmed.length < 3 || trimmed.length > 20) {
        return res.status(400).json({ error: 'Le pseudo doit faire entre 3 et 20 caractères' });
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        return res.status(400).json({
          error: 'Le pseudo ne peut contenir que des lettres, chiffres, tirets et underscores',
        });
      }
      const taken = await prisma.user.findFirst({
        where: { username: trimmed, NOT: { id: dbUser.id } },
        select: { id: true },
      });
      if (taken) {
        return res.status(400).json({ error: 'Ce pseudo est déjà pris' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        role: 'PARTICIPANT',
        ...(provided && trimmed ? { username: trimmed } : {}),
      },
    });

    try {
      const client = typeof clerkClient === 'function' ? await clerkClient() : clerkClient;
      if (provided && trimmed) {
        await client.users.updateUser(updatedUser.clerkId, { username: trimmed });
      }
      await client.users.updateUserMetadata(updatedUser.clerkId, {
        publicMetadata: {
          role: 'PARTICIPANT',
          username: updatedUser.username,
        },
      });
    } catch (error) {
      console.error('Error syncing role to Clerk:', error);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error upgrading to participant:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour du rôle' });
  }
}
