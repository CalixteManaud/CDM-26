/**
 * GET /api/bets/quota[?matchId=<id>]
 *
 * Renvoie le quota de mise restant pour l'user courant (depuis minuit Paris) :
 *  - journalier (toujours)
 *  - sur un match précis (si `matchId` fourni)
 *
 * Sert à l'affichage "il te reste X pts" + au plafonnement du champ de mise.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import {
  getUserSpentToday,
  DAILY_POINT_QUOTA,
  PER_MATCH_POINT_QUOTA,
} from '@/lib/utils/bet-quota';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });

  const { daily, perMatch } = await getUserSpentToday(dbUser.id);
  const matchId = typeof req.query.matchId === 'string' ? req.query.matchId : null;

  const body: {
    dailyQuota: number;
    dailySpent: number;
    dailyRemaining: number;
    matchQuota?: number;
    matchSpent?: number;
    matchRemaining?: number;
  } = {
    dailyQuota: DAILY_POINT_QUOTA,
    dailySpent: daily,
    dailyRemaining: Math.max(0, DAILY_POINT_QUOTA - daily),
  };

  if (matchId) {
    const spent = perMatch.get(matchId) ?? 0;
    body.matchQuota = PER_MATCH_POINT_QUOTA;
    body.matchSpent = spent;
    body.matchRemaining = Math.max(0, PER_MATCH_POINT_QUOTA - spent);
  }

  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json(body);
}
