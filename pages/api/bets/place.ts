/**
 * POST /api/bets/place
 *
 * Permet à un user authentifié (Clerk) de placer un pari depuis le site.
 * Flow:
 *  1. Auth Clerk → DB user (twitchUsername requis pour le débit Wizebot)
 *  2. Validation body (matchId, outcome, points)
 *  3. Pré-check fenêtre de paris (évite un débit Wizebot pour rien)
 *  4. Débit Wizebot (points/remove) — si fail (solde insuffisant, réseau...) → abort
 *  5. placeBet(wizebotDebitTxId) — si fail après débit (race rare), on log
 *     pour permettre un refund manuel.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import prisma from '@/lib/prisma';
import { placeBet, BettingError } from '@/lib/utils/betting';
import { debitWizebotPoints } from '@/lib/wizebot';
import { BetOutcome } from '@/prisma/prisma-client/enums';
import { isBettingOpen } from '@/lib/utils/odds';

const MIN_POINTS = 1;
const MAX_POINTS = 1_000_000;

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

  // 1. Auth
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });

  if (!dbUser.twitchUsername) {
    return res.status(400).json({
      error: 'Lie ton compte Twitch sur ton profil pour parier — les mises sont débitées sur tes points de chaîne Wizebot.',
      code: 'NO_TWITCH_LINK',
    });
  }

  // 2. Body validation
  const body = (req.body ?? {}) as {
    matchId?: unknown;
    outcome?: unknown;
    points?: unknown;
  };
  const matchId = typeof body.matchId === 'string' ? body.matchId : null;
  const outcome = parseOutcome(body.outcome);
  const points = typeof body.points === 'number' ? body.points : Number.parseInt(String(body.points ?? ''), 10);

  if (!matchId || !outcome || !Number.isFinite(points)) {
    return res.status(400).json({ error: 'matchId, outcome (HOME|DRAW|AWAY) et points requis' });
  }
  if (!Number.isInteger(points) || points < MIN_POINTS) {
    return res.status(400).json({ error: `Mise minimum: ${MIN_POINTS} pt`, code: 'MIN_BET' });
  }
  if (points > MAX_POINTS) {
    return res.status(400).json({ error: `Mise maximum: ${MAX_POINTS} pts`, code: 'MAX_BET' });
  }

  // 3. Pré-check (évite un débit Wizebot pour rien)
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, status: true, matchDate: true },
  });
  if (!match) return res.status(404).json({ error: 'Match introuvable', code: 'MATCH_NOT_FOUND' });
  if (!isBettingOpen(match)) {
    return res.status(400).json({ error: 'Les paris sont fermés sur ce match', code: 'BETTING_CLOSED' });
  }

  // 4. Débit Wizebot
  const debit = await debitWizebotPoints({
    twitchUsername: dbUser.twitchUsername,
    amount: points,
    reason: `CDM 26 — pari sur ${matchId}`,
  });

  if (!debit.ok) {
    const status = debit.code === 'INSUFFICIENT_FUNDS' ? 402 : 502;
    return res.status(status).json({
      error: debit.code === 'INSUFFICIENT_FUNDS'
        ? "Solde Wizebot insuffisant pour cette mise."
        : `Débit Wizebot échoué: ${debit.error}`,
      code: debit.code ?? 'WIZEBOT_DEBIT_FAILED',
    });
  }

  // 5. Placement du pari
  try {
    const result = await placeBet({
      userId: dbUser.id,
      matchId,
      outcome,
      pointsWagered: points,
      wizebotDebitTxId: debit.txId,
    });

    return res.status(200).json({
      success: true,
      betId: result.betId,
      oddsAtPlacement: result.oddsAtPlacement,
    });
  } catch (err) {
    // Edge case : Wizebot débité mais placement KO (race rare avec la fenêtre
    // de paris). On log explicitement pour permettre un remboursement manuel.
    console.error('[bets/place] DEBIT DONE BUT BET FAILED', {
      userId: dbUser.id,
      matchId,
      points,
      debitTxId: debit.txId,
      err,
    });

    if (err instanceof BettingError) {
      return res.status(409).json({
        error: `${err.message} — un débit Wizebot de ${points} pts a été effectué (tx ${debit.txId}), contacte un admin pour remboursement.`,
        code: err.code,
        debitTxId: debit.txId,
      });
    }
    return res.status(500).json({
      error: `Erreur interne — débit Wizebot de ${points} pts effectué (tx ${debit.txId}), contacte un admin.`,
      code: 'INTERNAL',
      debitTxId: debit.txId,
    });
  }
}
