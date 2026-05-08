/**
 * GET /api/matches/[id]/live-odds
 *
 * Retourne le snapshot courant du marché 1X2 + tous les marchés
 * additionnels du match. Utilisé par le polling côté front pour
 * refresh les cotes pendant un match LIVE.
 *
 * Pas d'auth requise : les cotes sont publiques.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { computeLiveOdds, bettingPhase } from '@/lib/utils/odds';
import { computeMarketOdds } from '@/lib/utils/markets';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id) return res.status(400).json({ error: 'id requis' });

  const match = await prisma.match.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      matchDate: true,
      homeScore: true,
      awayScore: true,
      bettingPool: {
        select: {
          totalHomePool: true,
          totalDrawPool: true,
          totalAwayPool: true,
          betCount: true,
          uniqueBettors: true,
          housePercentage: true,
        },
      },
      bettingMarkets: {
        select: {
          id: true,
          type: true,
          status: true,
          param: true,
          closesAt: true,
          housePercentage: true,
          pools: {
            select: {
              id: true,
              outcomeKey: true,
              totalPool: true,
              betCount: true,
            },
          },
        },
      },
    },
  });

  if (!match) return res.status(404).json({ error: 'Match introuvable' });

  const phase = bettingPhase(match);
  const oneXTwo = match.bettingPool ? computeLiveOdds(match.bettingPool) : null;

  const markets = match.bettingMarkets.map((m) => ({
    id: m.id,
    type: m.type,
    status: m.status,
    param: m.param,
    closesAt: m.closesAt,
    odds: computeMarketOdds(m.pools, Number(m.housePercentage)),
    pools: m.pools,
  }));

  // Cache court côté CDN pour éviter de marteler la DB sur des matchs hot
  res.setHeader('Cache-Control', 'public, max-age=2, stale-while-revalidate=4');

  return res.status(200).json({
    matchId: match.id,
    status: match.status,
    phase,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    pool: match.bettingPool,
    oneXTwo,
    markets,
    serverTime: new Date().toISOString(),
  });
}
