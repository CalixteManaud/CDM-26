import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import prisma from '@/lib/prisma';

/**
 * GET /api/tournaments/importable?excludeId=<uuid>
 *
 * Renvoie la liste des tournois qui peuvent servir de source pour un import
 * d'équipes : tous les tournois (actifs ou archivés) ayant au moins 1 équipe,
 * sauf celui passé en `excludeId`. Admin uniquement.
 *
 * Utilisé par le dialog d'import sur la page tournoi (sélection de la source).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const dbUser = await syncClerkUserById(userId);
  if (!dbUser || dbUser.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin requis' });
  }

  const excludeId = typeof req.query.excludeId === 'string' ? req.query.excludeId : null;

  const tournaments = await prisma.tournament.findMany({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      teams: { some: {} },
    },
    select: {
      id: true,
      name: true,
      startDate: true,
      archivedAt: true,
      _count: { select: { teams: true } },
    },
    orderBy: { startDate: 'desc' },
  });

  return res.status(200).json({ success: true, data: tournaments });
}
