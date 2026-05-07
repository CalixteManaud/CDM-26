/**
 * GET /api/matches/[id]/pool
 *
 * Retourne le pool de paris en direct + les cotes calculées.
 * Public (pas d'auth requise) — destiné à être polled par le front (toutes les 5-10s).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { computeLiveOdds, isBettingOpen } from '@/lib/utils/betting';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const matchId = req.query.id as string;
  if (!matchId) return res.status(400).json({ error: 'Match ID requis' });

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      status: true,
      matchDate: true,
      homeScore: true,
      awayScore: true,
      winnerTeamId: true,
      homeTeam: { select: { id: true, name: true, shortName: true, logo: true } },
      awayTeam: { select: { id: true, name: true, shortName: true, logo: true } },
      bettingPool: true,
    },
  });

  if (!match) return res.status(404).json({ error: 'Match introuvable' });

  const pool = match.bettingPool;
  const odds = pool
    ? computeLiveOdds(pool)
    : { home: null, draw: null, away: null };

  // Cache court côté CDN/browser pour limiter le DDOS si polling agressif
  res.setHeader('Cache-Control', 'public, max-age=2, stale-while-revalidate=4');

  return res.status(200).json({
    matchId: match.id,
    bettingOpen: isBettingOpen({ status: match.status, matchDate: match.matchDate }),
    matchDate: match.matchDate,
    status: match.status,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    pool: pool
      ? {
          totalHomePool: pool.totalHomePool,
          totalDrawPool: pool.totalDrawPool,
          totalAwayPool: pool.totalAwayPool,
          totalPool: pool.totalHomePool + pool.totalDrawPool + pool.totalAwayPool,
          betCount: pool.betCount,
          uniqueBettors: pool.uniqueBettors,
          housePercentage: Number(pool.housePercentage),
          finalTotalPool: pool.finalTotalPool,
          lockedAt: pool.lockedAt,
          settledAt: pool.settledAt,
        }
      : {
          totalHomePool: 0,
          totalDrawPool: 0,
          totalAwayPool: 0,
          totalPool: 0,
          betCount: 0,
          uniqueBettors: 0,
          housePercentage: 0,
          finalTotalPool: null,
          lockedAt: null,
          settledAt: null,
        },
    odds,
  });
}
