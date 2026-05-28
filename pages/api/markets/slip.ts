/**
 * POST /api/markets/slip
 *
 * Place un pari combiné. La mise totale est débitée une seule fois sur
 * Wizebot. Le payout est conditionné à TOUTES les jambes gagnantes
 * (cote = produit des cotes individuelles).
 *
 * Body: {
 *   legs: Array<{ marketId: string; outcomeKey: string }>,
 *   totalStake: number,
 * }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { canUserBetOnMarket, betRefusalMessage } from '@/lib/utils/permissions';
import { rateLimitBet } from '@/lib/rate-limit';

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

  const rl = await rateLimitBet(dbUser.id);
  if (!rl.success) {
    res.setHeader('Retry-After', Math.ceil((rl.resetAt - Date.now()) / 1000));
    return res.status(429).json({
      error: 'Trop de paris en peu de temps — patiente quelques secondes.',
      code: 'RATE_LIMITED',
    });
  }

  const body = (req.body ?? {}) as { legs?: unknown; totalStake?: unknown };
  const legs = Array.isArray(body.legs) ? body.legs : null;
  const totalStake =
    typeof body.totalStake === 'number'
      ? body.totalStake
      : Number.parseInt(String(body.totalStake ?? ''), 10);

  if (!legs || !legs.length || !Number.isFinite(totalStake)) {
    return res.status(400).json({ error: 'legs et totalStake requis', code: 'BAD_INPUT' });
  }

  const cleanedLegs: Array<{ marketId: string; outcomeKey: string }> = [];
  for (const raw of legs) {
    if (
      !raw ||
      typeof raw !== 'object' ||
      typeof (raw as { marketId?: unknown }).marketId !== 'string' ||
      typeof (raw as { outcomeKey?: unknown }).outcomeKey !== 'string'
    ) {
      return res.status(400).json({ error: 'Jambe invalide dans le combiné', code: 'BAD_LEG' });
    }
    cleanedLegs.push({
      marketId: (raw as { marketId: string }).marketId,
      outcomeKey: (raw as { outcomeKey: string }).outcomeKey,
    });
  }

  // Permission par jambe — si un seul des tournois concernés bloque l'user
  // (joueur/coach/admin), tout le combiné est refusé.
  for (const leg of cleanedLegs) {
    const permission = await canUserBetOnMarket(dbUser.id, leg.marketId);
    if (!permission.ok) {
      if (permission.reason === 'NOT_FOUND') {
        return res
          .status(404)
          .json({ error: 'Un marché du combiné est introuvable', code: 'NOT_FOUND' });
      }
      return res.status(403).json({
        error: betRefusalMessage(permission.reason),
        code: `FORBIDDEN_${permission.reason}`,
      });
    }
  }

  const { placeBetSlip } = await import('@/actions/markets');
  const result = await placeBetSlip({
    userId: dbUser.id,
    twitchUsername: dbUser.twitchUsername,
    legs: cleanedLegs,
    totalStake,
  });

  if (!result.success) {
    const status =
      result.code === 'INSUFFICIENT_FUNDS'
        ? 402
        : result.code === 'CLOSED' || result.code === 'TOO_FEW_LEGS' || result.code === 'TOO_MANY_LEGS' || result.code === 'DUPLICATE_MARKET' || result.code === 'OUTCOME_LOCKED'
        ? 400
        : result.code === 'NOT_FOUND' || result.code === 'BAD_OUTCOME'
        ? 404
        : 500;
    return res.status(status).json({ error: result.error, code: result.code });
  }

  return res.status(200).json({ success: true, slip: result.data });
}
