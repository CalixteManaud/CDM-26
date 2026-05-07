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

    // Check if user is already PARTICIPANT or ADMIN
    if (dbUser.role !== 'GUEST') {
      return res.status(400).json({ error: 'Vous êtes déjà participant ou administrateur' });
    }

    // Upgrade user to PARTICIPANT
    const updatedUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: { role: 'PARTICIPANT' },
    });

    // Sync role to Clerk publicMetadata
    try {
      const client = typeof clerkClient === 'function' ? await clerkClient() : clerkClient;
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
