import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
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
      return res.status(403).json({ error: 'Seuls les administrateurs peuvent assigner des coachs' });
    }

    const { teamId, coachUserId } = req.body;
    if (!teamId || !coachUserId) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }

    const coach = await prisma.user.findUnique({
      where: { id: coachUserId },
    });

    if (!coach) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    // Ensure the coach is at least a PARTICIPANT
    if (coach.role === 'GUEST') {
      await prisma.user.update({
        where: { id: coachUserId },
        data: { role: 'PARTICIPANT' },
      });
    }

    await prisma.team.update({
      where: { id: teamId },
      data: { coachUserId },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error assigning coach:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'assignation du coach' });
  }
}
