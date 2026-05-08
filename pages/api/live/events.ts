/**
 * GET /api/live/events?since=<ISO>
 *
 * Endpoint global qui agrège les events récents de TOUS les matchs en cours
 * (status LIVE) ou tout juste terminés (FINISHED < 5 min). Chaque event
 * embarque les infos du match concerné (équipes, score) + joueur/équipe ciblé,
 * pour que le toast côté front sache exactement qui est qui.
 *
 * Pas d'auth — les events sont publics. Cache CDN court pour absorber les
 * pics de polling pendant un match qui anime tout le site.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

const RECENT_FINISHED_WINDOW_MS = 5 * 60 * 1000;
// Plafond de sécurité : on ne renvoie jamais plus que ça par appel
const MAX_EVENTS = 30;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sinceParam = typeof req.query.since === 'string' ? req.query.since : null;
  const sinceDate = sinceParam ? new Date(sinceParam) : null;
  const since =
    sinceDate && !Number.isNaN(sinceDate.getTime())
      ? sinceDate
      : new Date(Date.now() - 60_000); // par défaut, 1 minute en arrière

  const recentFinishedCutoff = new Date(Date.now() - RECENT_FINISHED_WINDOW_MS);

  const events = await prisma.matchEvent.findMany({
    where: {
      createdAt: { gt: since },
      match: {
        OR: [
          { status: 'LIVE' },
          { status: 'FINISHED', updatedAt: { gt: recentFinishedCutoff } },
        ],
      },
    },
    orderBy: { createdAt: 'asc' },
    take: MAX_EVENTS,
    select: {
      id: true,
      type: true,
      minute: true,
      description: true,
      createdAt: true,
      match: {
        select: {
          id: true,
          status: true,
          homeScore: true,
          awayScore: true,
          homeTeam: { select: { id: true, name: true, shortName: true, logo: true } },
          awayTeam: { select: { id: true, name: true, shortName: true, logo: true } },
        },
      },
      team: { select: { id: true, name: true, shortName: true, logo: true } },
      player: {
        select: {
          id: true,
          jerseyNumber: true,
          user: { select: { name: true, username: true, avatar: true } },
        },
      },
    },
  });

  res.setHeader('Cache-Control', 'public, max-age=2, stale-while-revalidate=4');
  return res.status(200).json({
    events,
    serverTime: new Date().toISOString(),
  });
}
