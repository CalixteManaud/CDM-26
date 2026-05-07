import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
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
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const matchId = req.query.id as string;
    const { twitchUrl, discordUrl, youtubeUrl, streamTitle } = req.body;

    if (!matchId) {
      return res.status(400).json({ error: 'Match ID requis' });
    }

    // Récupérer le match avec les équipes
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    });

    if (!match) {
      return res.status(404).json({ error: 'Match non trouvé' });
    }

    // Vérifier les permissions : admin ou coach d'une des équipes
    const isAdmin = dbUser.role === 'ADMIN';
    const isHomeCoach = match.homeTeam.coachUserId === dbUser.id;
    const isAwayCoach = match.awayTeam.coachUserId === dbUser.id;
    const canManage = isAdmin || isHomeCoach || isAwayCoach;

    if (!canManage) {
      return res.status(403).json({
        error: 'Permissions insuffisantes - Seuls les admins et les coachs des équipes peuvent ajouter des liens de diffusion',
      });
    }

    // Mettre à jour les URLs de streaming
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        twitchUrl: twitchUrl !== undefined ? (twitchUrl?.trim() || null) : undefined,
        discordUrl: discordUrl !== undefined ? (discordUrl?.trim() || null) : undefined,
        youtubeUrl: youtubeUrl !== undefined ? (youtubeUrl?.trim() || null) : undefined,
        streamTitle: streamTitle !== undefined ? (streamTitle?.trim() || null) : undefined,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    });

    return res.status(200).json({
      success: true,
      match: updatedMatch,
    });
  } catch (error) {
    console.error('Error updating stream URLs:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
