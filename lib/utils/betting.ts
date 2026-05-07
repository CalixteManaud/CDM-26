/**
 * Logique métier pour les paris en pari mutuel (système Wizebot).
 *
 * Calcul des cotes:
 *   cote_X = (totalPool / poolPourX) * (1 - houseCut)
 *
 * Calcul du payout au settlement:
 *   payout = pointsWagered * (finalTotalPool * (1 - houseCut)) / poolGagnant
 *
 * Verrouillage: pas de flag stocké, dérivé de match.status ET match.matchDate.
 */

import prisma from '@/lib/prisma';
import { BetOutcome, BetSource, BetStatus, MatchStatus } from '@/prisma/prisma-client/enums';
import { creditWizebotPoints } from '@/lib/wizebot';
import { computeLiveOdds, isBettingOpen } from './odds';

// Helpers purs ré-exportés pour les imports serveur déjà en place.
// Les composants client doivent importer directement depuis `@/lib/utils/odds`
// (ce fichier-ci pull Prisma + wizebot et fuiterait dans le bundle browser).
export { computeLiveOdds, isBettingOpen };
export type { LiveOdds } from './odds';

const MIN_BET_POINTS = 1;
const MAX_BET_POINTS = 1_000_000;

export class BettingError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

/**
 * Place un pari pour un user authentifié sur un match donné.
 * Effectue la validation, l'incrémentation atomique du pool, et la création du Bet
 * dans une transaction Prisma.
 *
 * `wizebotEventId` permet l'idempotence si Wizebot retry.
 */
export async function placeBet(params: {
  userId: string;
  matchId: string;
  outcome: BetOutcome;
  pointsWagered: number;
  source?: BetSource; // défaut WIZEBOT pour rétro-compatibilité avec le webhook chat
  wizebotEventId?: string;
  wizebotDebitTxId?: string; // pour les paris site, traçabilité du débit
}): Promise<{ betId: string; oddsAtPlacement: number }> {
  const { userId, matchId, outcome, pointsWagered } = params;
  const source = params.source ?? BetSource.WIZEBOT;

  // Validation des points
  if (!Number.isInteger(pointsWagered) || pointsWagered < MIN_BET_POINTS) {
    throw new BettingError(
      `Mise minimum: ${MIN_BET_POINTS} pt`,
      'MIN_BET'
    );
  }
  if (pointsWagered > MAX_BET_POINTS) {
    throw new BettingError(`Mise maximum: ${MAX_BET_POINTS} pts`, 'MAX_BET');
  }

  // Idempotence: si on a déjà ce wizebotEventId, retourner le pari existant
  if (params.wizebotEventId) {
    const existing = await prisma.bet.findUnique({
      where: { wizebotEventId: params.wizebotEventId },
    });
    if (existing) {
      return {
        betId: existing.id,
        oddsAtPlacement: Number(existing.oddsAtPlacement),
      };
    }
  }

  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: { bettingPool: true },
    });

    if (!match) {
      throw new BettingError('Match introuvable', 'MATCH_NOT_FOUND');
    }
    if (!isBettingOpen(match)) {
      throw new BettingError(
        'Les paris sont fermés sur ce match',
        'BETTING_CLOSED'
      );
    }

    // Verrou d'exclusivité — un user qui a déjà parié via l'autre canal sur ce
    // match ne peut pas parier via celui-ci (évite le double-dipping Twitch+Site).
    const conflicting = await tx.bet.findFirst({
      where: { userId, matchId, source: { not: source } },
      select: { source: true },
    });
    if (conflicting) {
      const otherChannel = conflicting.source === BetSource.WIZEBOT ? 'le chat Twitch' : 'le site';
      throw new BettingError(
        `Tu as déjà parié via ${otherChannel} sur ce match. Reste sur ce canal pour les paris suivants.`,
        'CHANNEL_CONFLICT'
      );
    }

    // Pour HOME_WIN/AWAY_WIN, on stocke aussi le teamId
    const pickedTeamId =
      outcome === BetOutcome.HOME_WIN
        ? match.homeTeamId
        : outcome === BetOutcome.AWAY_WIN
          ? match.awayTeamId
          : null;

    // Créer le pool si absent
    const pool = match.bettingPool
      ? match.bettingPool
      : await tx.matchBettingPool.create({
          data: { matchId },
        });

    // Incrémenter le pool correspondant
    const poolField =
      outcome === BetOutcome.HOME_WIN
        ? 'totalHomePool'
        : outcome === BetOutcome.DRAW
          ? 'totalDrawPool'
          : 'totalAwayPool';

    // Détecter si c'est le 1er pari de cet utilisateur sur ce match
    const userPriorBet = await tx.bet.findFirst({
      where: { userId, matchId },
      select: { id: true },
    });

    const updatedPool = await tx.matchBettingPool.update({
      where: { id: pool.id },
      data: {
        [poolField]: { increment: pointsWagered },
        betCount: { increment: 1 },
        ...(userPriorBet ? {} : { uniqueBettors: { increment: 1 } }),
      },
    });

    const oddsAtPlacement = computeLiveOdds(updatedPool);
    const odds =
      outcome === BetOutcome.HOME_WIN
        ? oddsAtPlacement.home
        : outcome === BetOutcome.DRAW
          ? oddsAtPlacement.draw
          : oddsAtPlacement.away;

    const bet = await tx.bet.create({
      data: {
        matchId,
        userId,
        outcome,
        pickedTeamId,
        pointsWagered,
        oddsAtPlacement: odds ?? 1, // si seul à parier sur cette issue, cote=1 par défaut
        source,
        wizebotEventId: params.wizebotEventId ?? null,
        wizebotDebitTxId: params.wizebotDebitTxId ?? null,
      },
    });

    return { betId: bet.id, oddsAtPlacement: odds ?? 1 };
  });
}

/**
 * Verrouille le pool d'un match (snapshot des totaux) puis settle tous les
 * paris PENDING associés. Crédite ensuite les gagnants via Wizebot.
 *
 * À appeler quand le match passe à FINISHED avec winnerTeamId connu.
 *
 * Si le match est annulé (CANCELED), les paris passent en VOID et les mises
 * sont remboursées intégralement.
 */
export async function settleMatchBets(params: {
  matchId: string;
  outcome: BetOutcome | null; // null = match annulé → remboursement
}): Promise<{
  settled: number;
  winners: number;
  losers: number;
  refunded: number;
  creditFailed: number;
}> {
  const { matchId, outcome } = params;

  // 1. Lock le pool (snapshot finalTotalPool, lockedAt)
  // 2. Récupérer tous les bets PENDING
  // 3. Calculer les payouts
  // En une seule transaction pour éviter les races avec un placement tardif.
  const { winnersData, refundData, losersCount } = await prisma.$transaction(
    async (tx) => {
      const pool = await tx.matchBettingPool.findUnique({
        where: { matchId },
      });
      if (!pool) {
        return {
          winnersData: [] as { betId: string; userId: string; payout: number; twitchUsername: string | null }[],
          refundData: [] as { betId: string; userId: string; payout: number; twitchUsername: string | null }[],
          losersCount: 0,
        };
      }

      const finalTotal =
        pool.totalHomePool + pool.totalDrawPool + pool.totalAwayPool;
      const houseCut = Number(pool.housePercentage) / 100;

      await tx.matchBettingPool.update({
        where: { id: pool.id },
        data: {
          finalTotalPool: finalTotal,
          lockedAt: pool.lockedAt ?? new Date(),
          settledAt: new Date(),
        },
      });

      const pendingBets = await tx.bet.findMany({
        where: { matchId, status: BetStatus.PENDING },
        include: { user: { select: { twitchUsername: true } } },
      });

      const winnersData: {
        betId: string;
        userId: string;
        payout: number;
        twitchUsername: string | null;
      }[] = [];
      const refundData: typeof winnersData = [];

      // Annulation → remboursement
      if (outcome === null) {
        for (const bet of pendingBets) {
          await tx.bet.update({
            where: { id: bet.id },
            data: {
              status: BetStatus.VOID,
              actualPayout: bet.pointsWagered,
              settledAt: new Date(),
            },
          });
          refundData.push({
            betId: bet.id,
            userId: bet.userId,
            payout: bet.pointsWagered,
            twitchUsername: bet.user.twitchUsername,
          });
        }
        return { winnersData, refundData, losersCount: 0 };
      }

      // Match joué normalement
      const winningPool =
        outcome === BetOutcome.HOME_WIN
          ? pool.totalHomePool
          : outcome === BetOutcome.DRAW
            ? pool.totalDrawPool
            : pool.totalAwayPool;

      const distributablePool = Math.floor(finalTotal * (1 - houseCut));

      let losersCount = 0;
      for (const bet of pendingBets) {
        if (bet.outcome === outcome) {
          // Gagnant
          // Cas dégénéré: si winningPool == 0, normalement impossible
          // (le gagnant a forcément parié sur l'issue gagnante).
          const payout =
            winningPool > 0
              ? Math.floor((bet.pointsWagered / winningPool) * distributablePool)
              : bet.pointsWagered; // fallback: rembourser

          // Crédit Wizebot fait HORS transaction (ci-dessous), on stocke le bet
          // avec status PENDING_CREDIT temporairement non, on met directement WON
          // et on update wizebotCreditTxId après. Si crédit échoue, status -> CREDIT_FAILED.
          await tx.bet.update({
            where: { id: bet.id },
            data: {
              status: BetStatus.WON,
              actualPayout: payout,
              settledAt: new Date(),
            },
          });
          winnersData.push({
            betId: bet.id,
            userId: bet.userId,
            payout,
            twitchUsername: bet.user.twitchUsername,
          });
        } else {
          // Perdant
          await tx.bet.update({
            where: { id: bet.id },
            data: {
              status: BetStatus.LOST,
              actualPayout: 0,
              settledAt: new Date(),
            },
          });
          losersCount++;
        }
      }

      return { winnersData, refundData, losersCount };
    }
  );

  // Crédits Wizebot HORS transaction (réseau lent + on ne veut pas rollback la DB).
  let winners = 0;
  let creditFailed = 0;
  for (const w of winnersData) {
    if (!w.twitchUsername) {
      // Cas improbable (le user a parié donc twitchUsername était set).
      await prisma.bet.update({
        where: { id: w.betId },
        data: {
          status: BetStatus.CREDIT_FAILED,
          wizebotCreditError: 'twitchUsername absent au moment du settlement',
        },
      });
      creditFailed++;
      continue;
    }

    const credit = await creditWizebotPoints({
      twitchUsername: w.twitchUsername,
      amount: w.payout,
      reason: `CDM 26 — pari gagné (${matchId})`,
    });

    if (credit.ok) {
      await prisma.bet.update({
        where: { id: w.betId },
        data: { wizebotCreditTxId: credit.txId, wizebotCreditError: null },
      });
      winners++;
    } else {
      await prisma.bet.update({
        where: { id: w.betId },
        data: {
          status: BetStatus.CREDIT_FAILED,
          wizebotCreditError: credit.error,
        },
      });
      creditFailed++;
    }
  }

  let refunded = 0;
  for (const r of refundData) {
    if (!r.twitchUsername) continue;
    const credit = await creditWizebotPoints({
      twitchUsername: r.twitchUsername,
      amount: r.payout,
      reason: `CDM 26 — match annulé, remboursement (${matchId})`,
    });
    if (credit.ok) {
      await prisma.bet.update({
        where: { id: r.betId },
        data: { wizebotCreditTxId: credit.txId },
      });
      refunded++;
    } else {
      await prisma.bet.update({
        where: { id: r.betId },
        data: {
          status: BetStatus.CREDIT_FAILED,
          wizebotCreditError: credit.error,
        },
      });
      creditFailed++;
    }
  }

  return {
    settled: winnersData.length + losersCount + refundData.length,
    winners,
    losers: losersCount,
    refunded,
    creditFailed,
  };
}

/**
 * Détermine l'issue d'un match terminé à partir des scores.
 * Retourne null si scores absents (match non joué).
 */
export function matchOutcomeFromScores(
  homeScore: number | null,
  awayScore: number | null
): BetOutcome | null {
  if (homeScore == null || awayScore == null) return null;
  if (homeScore > awayScore) return BetOutcome.HOME_WIN;
  if (awayScore > homeScore) return BetOutcome.AWAY_WIN;
  return BetOutcome.DRAW;
}

/**
 * Rejoue les bets en CREDIT_FAILED (utile si Wizebot était down au moment
 * du settlement). Appelée par un endpoint admin ou un cron.
 */
export async function retryFailedCredits(): Promise<{
  retried: number;
  recovered: number;
  stillFailing: number;
}> {
  const failed = await prisma.bet.findMany({
    where: { status: BetStatus.CREDIT_FAILED },
    include: { user: { select: { twitchUsername: true } } },
    take: 100,
  });

  let recovered = 0;
  let stillFailing = 0;

  for (const bet of failed) {
    if (!bet.user.twitchUsername || bet.actualPayout <= 0) {
      stillFailing++;
      continue;
    }
    const credit = await creditWizebotPoints({
      twitchUsername: bet.user.twitchUsername,
      amount: bet.actualPayout,
      reason: `CDM 26 — retry credit (bet ${bet.id})`,
    });
    if (credit.ok) {
      await prisma.bet.update({
        where: { id: bet.id },
        data: {
          status: BetStatus.WON,
          wizebotCreditTxId: credit.txId,
          wizebotCreditError: null,
        },
      });
      recovered++;
    } else {
      await prisma.bet.update({
        where: { id: bet.id },
        data: { wizebotCreditError: credit.error },
      });
      stillFailing++;
    }
  }

  return { retried: failed.length, recovered, stillFailing };
}
