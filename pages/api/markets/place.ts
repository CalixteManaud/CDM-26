/**
 * POST /api/markets/place
 *
 * Place un pari simple sur un marché flexible (score exact, total buts, BTTS,
 * top buteur tournoi, MVP, vainqueur). Le 1X2 reste sur /api/bets/place.
 *
 * Body: { marketId: string, outcomeKey: string, points: number }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });

  if (!dbUser.twitchUsername) {
    return res.status(400).json({
      error: 'Lie ton compte Twitch sur ton profil pour parier.',
      code: 'NO_TWITCH_LINK',
    });
  }

  const body = (req.body ?? {}) as {
    marketId?: unknown;
    outcomeKey?: unknown;
    points?: unknown;
  };
  const marketId = typeof body.marketId === 'string' ? body.marketId : null;
  const outcomeKey = typeof body.outcomeKey === 'string' ? body.outcomeKey : null;
  const points =
    typeof body.points === 'number'
      ? body.points
      : Number.parseInt(String(body.points ?? ''), 10);

  if (!marketId || !outcomeKey || !Number.isFinite(points)) {
    return res
      .status(400)
      .json({ error: 'marketId, outcomeKey et points requis', code: 'BAD_INPUT' });
  }

  const { placeMarketBet } = await import('@/actions/markets');
  const result = await placeMarketBet({
    userId: dbUser.id,
    twitchUsername: dbUser.twitchUsername,
    marketId,
    outcomeKey,
    amount: points,
  });

  if (!result.success) {
    const status =
      result.code === 'INSUFFICIENT_FUNDS'
        ? 402
        : result.code === 'CLOSED'
        ? 400
        : result.code === 'NOT_FOUND'
        ? 404
        : result.code === 'BAD_OUTCOME'
        ? 400
        : 500;
    return res.status(status).json({ error: result.error, code: result.code });
  }

  return res.status(200).json({ success: true, bet: result.data });
}
