import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserFromReq } from '@/lib/clerk';
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

    const dbUser = await syncClerkUserFromReq(req);
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Permissions insuffisantes - Admin requis' });
    }

    const teamId = req.query.id as string;
    const { disqualified, reason } = req.body;

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID requis' });
    }

    if (typeof disqualified !== 'boolean') {
      return res.status(400).json({ error: 'Le champ disqualified doit être un booléen' });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        tournament: true,
        group: true,
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Équipe introuvable' });
    }

    // Mettre à jour le statut de disqualification
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        disqualified,
        disqualificationReason: disqualified ? (reason || 'Non spécifié') : null,
      },
      include: {
        tournament: true,
        group: true,
        coach: true,
      },
    });

    let playoffInfo = null;

    // Si l'équipe est disqualifiée, vérifier si elle est dans un match de knockout
    if (disqualified) {
      const knockoutMatches = await prisma.match.findMany({
        where: {
          tournamentId: team.tournamentId,
          stage: { in: ['QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'] },
          status: 'SCHEDULED',
          OR: [
            { homeTeamId: teamId },
            { awayTeamId: teamId },
          ],
        },
      });

      if (knockoutMatches.length > 0) {
        // L'équipe est dans un match de knockout → Générer les barrages
        const { generatePlayoffForReplacement } = await import('@/lib/utils/team-replacement');

        playoffInfo = await generatePlayoffForReplacement(team.tournamentId, teamId);
      }
    }

    return res.status(200).json({
      success: true,
      team: updatedTeam,
      playoffInfo,
      message: disqualified
        ? playoffInfo
          ? `${team.name} a été disqualifiée. Des matchs de barrage ont été créés pour la remplacer.`
          : `${team.name} a été disqualifiée`
        : `${team.name} a été réintégrée`,
    });
  } catch (error) {
    console.error('Error updating team disqualification:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
