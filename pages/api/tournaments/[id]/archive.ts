import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import prisma from '@/lib/prisma';

/**
 * POST /api/tournaments/[id]/archive
 *
 * Body: { archive: boolean } — true pour archiver, false pour désarchiver.
 *
 * Réservé aux admins. Non destructif : on positionne juste archivedAt.
 * Toute la donnée (matchs, standings, paris settlés) est préservée.
 */
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
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Permissions insuffisantes - Admin requis' });
    }

    const tournamentId = req.query.id as string;
    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID requis' });
    }

    const { archive } = req.body as { archive?: unknown };
    if (typeof archive !== 'boolean') {
      return res.status(400).json({ error: 'Champ "archive" (boolean) requis' });
    }

    const existing = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, archivedAt: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Tournoi introuvable' });
    }

    const tournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: { archivedAt: archive ? new Date() : null },
      select: { id: true, name: true, archivedAt: true },
    });

    return res.status(200).json({ success: true, data: tournament });
  } catch (error) {
    console.error('Error toggling tournament archive:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur serveur',
    });
  }
}
