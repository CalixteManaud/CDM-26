/**
 * POST /api/bets/[betId]/modify  { outcome?, points }
 *
 * Modifie un pari 1X2 dans sa fenêtre de 3 min : change la mise et/ou l'issue.
 *  - Augmentation (delta > 0) : quota → débit Wizebot → applyBetModification.
 *  - Réduction (delta < 0) : applyBetModification → crédit Wizebot du delta.
 *  - Changement d'issue à mise égale : pas de mouvement Wizebot.
 *
 * Si l'application DB échoue après un débit, on enregistre un pending refund
 * (rejoué par le cron) pour ne jamais léser le parieur.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import prisma from '@/lib/prisma';
import {
  applyBetModification,
  BettingError,
  recordPendingRefund,
  MIN_BET_POINTS,
  MAX_BET_POINTS,
} from '@/lib/utils/betting';
import { creditWizebotPoints, debitWizebotPoints } from '@/lib/wizebot';
import { BetOutcome, BetStatus } from '@/prisma/prisma-client/enums';
import { isBettingOpen, BET_EDIT_WINDOW_MS } from '@/lib/utils/odds';
import { canUserBetOnMatch, betRefusalMessage } from '@/lib/utils/permissions';
import { rateLimitBet } from '@/lib/rate-limit';
import { checkBetWithinQuota } from '@/lib/utils/bet-quota';

function parseOutcome(raw: unknown): BetOutcome | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toUpperCase();
  if (v === 'HOME' || v === 'HOME_WIN') return BetOutcome.HOME_WIN;
  if (v === 'AWAY' || v === 'AWAY_WIN') return BetOutcome.AWAY_WIN;
  if (v === 'DRAW') return BetOutcome.DRAW;
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });
  if (!dbUser.twitchUsername) {
    return res.status(400).json({ error: 'Compte Twitch non lié', code: 'NO_TWITCH_LINK' });
  }

  const betId = typeof req.query.betId === 'string' ? req.query.betId : null;
  if (!betId) return res.status(400).json({ error: 'betId requis' });

  const rl = await rateLimitBet(dbUser.id);
  if (!rl.success) {
    res.setHeader('Retry-After', Math.ceil((rl.resetAt - Date.now()) / 1000));
    return res.status(429).json({ error: 'Trop d\'actions en peu de temps — patiente.', code: 'RATE_LIMITED' });
  }

  const body = (req.body ?? {}) as { outcome?: unknown; points?: unknown };
  const newPoints =
    typeof body.points === 'number' ? body.points : Number.parseInt(String(body.points ?? ''), 10);
  if (!Number.isInteger(newPoints) || newPoints < MIN_BET_POINTS) {
    return res.status(400).json({ error: `Mise minimum: ${MIN_BET_POINTS} pt`, code: 'MIN_BET' });
  }
  if (newPoints > MAX_BET_POINTS) {
    return res
      .status(400)
      .json({ error: `Mise maximum: ${MAX_BET_POINTS.toLocaleString('fr-FR')} pts`, code: 'MAX_BET' });
  }

  // Charge le pari + son match pour calculer le delta et pré-valider la fenêtre.
  const bet = await prisma.bet.findUnique({
    where: { id: betId },
    select: {
      id: true,
      userId: true,
      outcome: true,
      pointsWagered: true,
      status: true,
      createdAt: true,
      matchId: true,
      match: { select: { status: true, matchDate: true } },
    },
  });
  if (!bet) return res.status(404).json({ error: 'Pari introuvable', code: 'BET_NOT_FOUND' });
  if (bet.userId !== dbUser.id) return res.status(403).json({ error: "Ce pari ne t'appartient pas", code: 'FORBIDDEN' });
  if (bet.status !== BetStatus.PENDING) {
    return res.status(409).json({ error: 'Ce pari ne peut plus être modifié', code: 'NOT_PENDING' });
  }
  if (Date.now() > bet.createdAt.getTime() + BET_EDIT_WINDOW_MS) {
    return res.status(409).json({ error: 'Fenêtre de modification expirée (3 min)', code: 'EDIT_WINDOW_EXPIRED' });
  }
  if (!isBettingOpen(bet.match)) {
    return res.status(409).json({ error: 'Les paris sont fermés sur ce match', code: 'BETTING_CLOSED' });
  }

  const newOutcome = parseOutcome(body.outcome) ?? bet.outcome;
  const delta = newPoints - bet.pointsWagered;

  // Une augmentation = nouveaux points engagés → re-check permission + quota + débit.
  if (delta > 0) {
    const permission = await canUserBetOnMatch(dbUser.id, bet.matchId);
    if (!permission.ok) {
      if (permission.reason === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Match introuvable', code: 'MATCH_NOT_FOUND' });
      }
      return res
        .status(403)
        .json({ error: betRefusalMessage(permission.reason), code: `FORBIDDEN_${permission.reason}` });
    }

    const quota = await checkBetWithinQuota(dbUser.id, {
      daily: delta,
      perMatch: { [bet.matchId]: delta },
    });
    if (!quota.ok) {
      return res.status(400).json({ error: quota.error, code: quota.code, remaining: quota.remaining });
    }

    const debit = await debitWizebotPoints({
      twitchUsername: dbUser.twitchUsername,
      amount: delta,
      reason: `CDM 26 — modif pari +${delta} (match ${bet.matchId})`,
    });
    if (!debit.ok) {
      const status = debit.code === 'INSUFFICIENT_FUNDS' ? 402 : 502;
      return res.status(status).json({
        error:
          debit.code === 'INSUFFICIENT_FUNDS'
            ? 'Solde Wizebot insuffisant pour augmenter cette mise.'
            : `Débit Wizebot échoué: ${debit.error}`,
        code: debit.code ?? 'WIZEBOT_DEBIT_FAILED',
      });
    }

    try {
      const result = await applyBetModification({
        userId: dbUser.id,
        betId,
        newOutcome,
        newPoints,
        addedDebitTxId: debit.txId,
      });
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      console.error('[bets/modify] DEBIT DONE BUT MODIFY FAILED', { betId, delta, debitTxId: debit.txId, err });
      await recordPendingRefund({
        userId: dbUser.id,
        twitchUsername: dbUser.twitchUsername,
        amount: delta,
        reason: `modif pari 1X2 (match ${bet.matchId})`,
        wizebotDebitTxId: debit.txId,
      });
      if (err instanceof BettingError) {
        return res.status(409).json({
          error: `${err.message} — le débit de ${delta} pts sera remboursé automatiquement.`,
          code: err.code,
        });
      }
      return res.status(500).json({ error: 'Erreur interne — débit remboursé automatiquement.', code: 'INTERNAL' });
    }
  }

  // delta <= 0 : on applique d'abord, puis on rembourse le delta négatif.
  let result: Awaited<ReturnType<typeof applyBetModification>>;
  try {
    result = await applyBetModification({ userId: dbUser.id, betId, newOutcome, newPoints });
  } catch (err) {
    if (err instanceof BettingError) {
      const status = err.code === 'FORBIDDEN' ? 403 : err.code === 'BET_NOT_FOUND' ? 404 : 409;
      return res.status(status).json({ error: err.message, code: err.code });
    }
    console.error('[bets/modify] erreur', { betId, err });
    return res.status(500).json({ error: 'Erreur lors de la modification' });
  }

  if (delta < 0) {
    const refund = -delta;
    const credit = await creditWizebotPoints({
      twitchUsername: dbUser.twitchUsername,
      amount: refund,
      reason: `CDM 26 — réduction pari (match ${bet.matchId})`,
    });
    if (!credit.ok) {
      console.error('[bets/modify] CREDIT WIZEBOT KO — pending refund', { betId, refund, error: credit.error });
      await recordPendingRefund({
        userId: dbUser.id,
        twitchUsername: dbUser.twitchUsername,
        amount: refund,
        reason: `réduction pari 1X2 (match ${bet.matchId})`,
      });
    }
  }

  return res.status(200).json({ success: true, ...result });
}
