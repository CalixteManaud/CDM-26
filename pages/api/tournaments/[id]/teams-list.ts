import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import prisma from '@/lib/prisma';

/**
 * GET /api/tournaments/[id]/teams-list
 *
 * Renvoie la liste légère des équipes d'un tournoi (id, nom, logo, nb joueurs).
 * Utilisé par le dialog d'import pour permettre la sélection ciblée. Admin uniquement.
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

  const tournamentId = req.query.id as string;
  if (!tournamentId) return res.status(400).json({ error: 'id requis' });

  const teams = await prisma.team.findMany({
    where: { tournamentId },
    select: {
      id: true,
      name: true,
      shortName: true,
      logo: true,
      _count: { select: { players: true } },
    },
    orderBy: { name: 'asc' },
  });

  return res.status(200).json({ success: true, data: teams });
}
