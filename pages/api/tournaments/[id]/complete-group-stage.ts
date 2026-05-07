import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserFromReq } from '@/lib/clerk';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vérifier l'authentification
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Vérifier que l'utilisateur est admin
    const dbUser = await syncClerkUserFromReq(req);
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Permissions insuffisantes - Admin requis' });
    }

    const tournamentId = req.query.id as string;

    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID requis' });
    }

    // Vérifier que le tournoi existe
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        matches: {
          where: { stage: 'GROUP' },
        },
      },
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournoi introuvable' });
    }

    // Vérifier que tous les matchs de groupe sont terminés
    const groupMatches = tournament.matches;
    const allFinished = groupMatches.length > 0 && groupMatches.every((m) => m.status === 'FINISHED');

    if (!allFinished) {
      return res.status(400).json({
        error: 'Tous les matchs de poule doivent être terminés avant de valider cette étape'
      });
    }

    // Marquer la phase de groupe comme terminée
    const updatedTournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: { groupStageComplete: true },
    });

    return res.status(200).json({
      success: true,
      data: updatedTournament,
    });
  } catch (error: unknown) {
    console.error('Error completing group stage:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur serveur',
    });
  }
}
