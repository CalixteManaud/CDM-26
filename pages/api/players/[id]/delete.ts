import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { canManageTeam } from '@/lib/utils/permissions';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
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

    const playerId = req.query.id as string;

    // Get player with team info
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { teamId: true },
    });

    if (!player) {
      return res.status(404).json({ error: 'Joueur introuvable' });
    }

    // Check if user can manage this team (admin OR team coach)
    const canManage = await canManageTeam(dbUser.id, player.teamId);
    if (!canManage) {
      return res.status(403).json({ error: 'Permissions insuffisantes' });
    }

    // Delete the player
    await prisma.player.delete({
      where: { id: playerId },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting player:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
