/**
 * POST /api/bets/[betId]/cancel
 *
 * Annule un pari 1X2 dans sa fenêtre de 3 min (cf. BET_EDIT_WINDOW_MS) :
 *  1. Auth Clerk → DB user.
 *  2. cancelBet() : retire la mise du pool + passe le Bet en CANCELED (transac).
 *  3. Crédite le remboursement côté Wizebot. Si le crédit échoue, on enregistre
 *     un pending refund (rejoué par le cron) pour ne jamais léser le parieur.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { cancelBet, BettingError, recordPendingRefund } from '@/lib/utils/betting';
import { creditWizebotPoints } from '@/lib/wizebot';
import { rateLimitBet } from '@/lib/rate-limit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });

  const betId = typeof req.query.betId === 'string' ? req.query.betId : null;
  if (!betId) return res.status(400).json({ error: 'betId requis' });

  const rl = await rateLimitBet(dbUser.id);
  if (!rl.success) {
    res.setHeader('Retry-After', Math.ceil((rl.resetAt - Date.now()) / 1000));
    return res.status(429).json({ error: 'Trop d\'actions en peu de temps — patiente.', code: 'RATE_LIMITED' });
  }

  let result: Awaited<ReturnType<typeof cancelBet>>;
  try {
    result = await cancelBet({ userId: dbUser.id, betId });
  } catch (err) {
    if (err instanceof BettingError) {
      const status = err.code === 'FORBIDDEN' ? 403 : err.code === 'BET_NOT_FOUND' ? 404 : 409;
      return res.status(status).json({ error: err.message, code: err.code });
    }
    console.error('[bets/cancel] erreur', { userId: dbUser.id, betId, err });
    return res.status(500).json({ error: 'Erreur lors de l\'annulation' });
  }

  // Remboursement Wizebot (best-effort, filet via pending refund).
  if (dbUser.twitchUsername && result.refund > 0) {
    const credit = await creditWizebotPoints({
      twitchUsername: dbUser.twitchUsername,
      amount: result.refund,
      reason: `CDM 26 — annulation pari (match ${result.matchId})`,
    });
    if (!credit.ok) {
      console.error('[bets/cancel] CREDIT WIZEBOT KO — pending refund', { betId, refund: result.refund, error: credit.error });
      await recordPendingRefund({
        userId: dbUser.id,
        twitchUsername: dbUser.twitchUsername,
        amount: result.refund,
        reason: `annulation pari 1X2 (match ${result.matchId})`,
      });
    }
  }

  return res.status(200).json({ success: true, refunded: result.refund });
}
