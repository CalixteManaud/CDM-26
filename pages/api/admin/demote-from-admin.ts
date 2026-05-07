import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { isSiteAdmin } from '@/lib/utils/permissions';
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

    const admin = await isSiteAdmin(dbUser.id);
    if (!admin) {
      return res.status(403).json({ error: 'Permissions insuffisantes' });
    }

    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ error: 'ID utilisateur manquant' });
    }

    if (dbUser.id === targetUserId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous rétrograder vous-même' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: 'PARTICIPANT' },
    });

    // Sync role to Clerk publicMetadata
    try {
      const client = typeof clerkClient === 'function' ? await clerkClient() : clerkClient;
      await client.users.updateUserMetadata(updatedUser.clerkId, {
        publicMetadata: { role: 'PARTICIPANT' },
      });
    } catch (error) {
      console.error('Error syncing role to Clerk:', error);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error demoting user:', error);
    return res.status(500).json({ error: 'Erreur lors de la rétrogradation' });
  }
}
