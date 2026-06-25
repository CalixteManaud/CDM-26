/**
 * Logique métier pour les paris en pari mutuel.
 *
 * Entrée unique : UI site (POST /api/bets/place). Monnaie : points de chaîne
 * Twitch gérés par Wizebot — débit/crédit via l'API Wizebot.
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
import { BetOutcome, BetStatus, RefundStatus } from '@/prisma/prisma-client/enums';
import { creditWizebotPoints } from '@/lib/wizebot';
import { computeLiveOdds, isBettingOpen, MIN_BET_POINTS, MAX_BET_POINTS } from './odds';

// Helpers purs ré-exportés pour les imports serveur déjà en place.
// Les composants client doivent importer directement depuis `@/lib/utils/odds`
// (ce fichier-ci pull Prisma + wizebot et fuiterait dans le bundle browser).
export { computeLiveOdds, isBettingOpen, MIN_BET_POINTS, MAX_BET_POINTS };
export type { LiveOdds } from './odds';

// Concurrence max sur les crédits Wizebot au settlement. 10 workers en parallèle
// × ~300ms par appel = ~30s pour settle 1000 paris (vs 5 min en séquentiel).
const SETTLEMENT_CONCURRENCY = 10;

/**
 * Run `tasks` avec une concurrence bornée (~p-limit minimal, sans dep externe).
 * Aucun task ne throw — chaque fn() est attendue de gérer sa propre erreur et
 * retourner un résultat structuré (cf. ok/error patterns dans wizebot.ts).
 */
async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= tasks.length) return;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

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
 * Le débit Wizebot est effectué AMONT par l'API route (cf. pages/api/bets/place.ts) ;
 * `wizebotDebitTxId` est l'ID retourné par Wizebot, stocké pour audit / refund manuel.
 */
export async function placeBet(params: {
  userId: string;
  matchId: string;
  outcome: BetOutcome;
  pointsWagered: number;
  wizebotDebitTxId?: string; // ID retourné par Wizebot points/remove
}): Promise<{ betId: string; oddsAtPlacement: number }> {
  const { userId, matchId, outcome, pointsWagered } = params;

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

    // Détecter si c'est le 1er pari de cet utilisateur sur ce match ET vérifier
    // qu'il ne tente pas de changer de camp (règle "no switching sides" : une
    // fois la première mise posée sur un outcome, on ne peut que cumuler dessus,
    // pas répartir sur les autres issues).
    const userPriorBet = await tx.bet.findFirst({
      where: { userId, matchId },
      select: { id: true, outcome: true },
    });

    if (userPriorBet && userPriorBet.outcome !== outcome) {
      throw new BettingError(
        'Tu as déjà parié sur une autre issue de ce match — impossible de changer de camp. Tu peux uniquement augmenter ta mise sur ton choix initial.',
        'OUTCOME_LOCKED'
      );
    }

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

      // Garde d'idempotence : si le match a déjà été réglé, on ne refait rien.
      // Empêche un double-settlement (double soumission de résultat, retry) de
      // re-créditer Wizebot. Les paris déjà settlés ne sont PAS recalculés : un
      // résultat corrigé après settlement nécessite une intervention admin
      // manuelle (reversal Wizebot) — d'où le log d'alerte ci-dessous plutôt
      // qu'un no-op totalement silencieux.
      if (pool.settledAt) {
        console.warn(
          `[settleMatchBets] match ${matchId} déjà réglé (settledAt=${pool.settledAt.toISOString()}) — settlement ignoré. Une correction de résultat ne sera PAS répercutée automatiquement.`
        );
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

      // Reliquat d'arrondi : la somme des floor() est < distributablePool.
      // On reverse le reste au plus gros gagnant pour ne pas laisser de points
      // « perdus » (cumulés sur le volume, ça compte). House cut déjà déduit.
      if (winnersData.length > 0) {
        const distributed = winnersData.reduce((s, w) => s + w.payout, 0);
        const remainder = distributablePool - distributed;
        if (remainder > 0) {
          const top = winnersData.reduce((best, w) =>
            w.payout > best.payout ? w : best
          );
          top.payout += remainder;
          await tx.bet.update({
            where: { id: top.betId },
            data: { actualPayout: top.payout },
          });
        }
      }

      return { winnersData, refundData, losersCount };
    }
  );

  // Crédits Wizebot HORS transaction, en parallèle borné (~30s pour 1000 paris
  // à concurrence 10, vs ~5min en séquentiel). Chaque worker met à jour son
  // Bet indépendamment — pas de transaction globale (réseau lent + on ne veut
  // pas rollback la DB si Wizebot tombe au milieu).
  type CreditResult = 'won' | 'refunded' | 'failed';

  const winnerTasks = winnersData.map((w) => async (): Promise<CreditResult> => {
    if (!w.twitchUsername) {
      await prisma.bet.update({
        where: { id: w.betId },
        data: {
          status: BetStatus.CREDIT_FAILED,
          wizebotCreditError: 'twitchUsername absent au moment du settlement',
        },
      });
      return 'failed';
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
      return 'won';
    }
    await prisma.bet.update({
      where: { id: w.betId },
      data: { status: BetStatus.CREDIT_FAILED, wizebotCreditError: credit.error },
    });
    return 'failed';
  });

  const refundTasks = refundData.map((r) => async (): Promise<CreditResult> => {
    if (!r.twitchUsername) return 'failed';
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
      return 'refunded';
    }
    await prisma.bet.update({
      where: { id: r.betId },
      data: { status: BetStatus.CREDIT_FAILED, wizebotCreditError: credit.error },
    });
    return 'failed';
  });

  const allResults = await runWithConcurrency(
    [...winnerTasks, ...refundTasks],
    SETTLEMENT_CONCURRENCY
  );

  let winners = 0;
  let refunded = 0;
  let creditFailed = 0;
  for (const r of allResults) {
    if (r === 'won') winners++;
    else if (r === 'refunded') refunded++;
    else creditFailed++;
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
 * Rejoue les crédits Wizebot tombés en CREDIT_FAILED (Wizebot down au settlement,
 * ou Twitch non lié à ce moment-là). Couvre les trois supports de gain :
 *  - Bet (1X2)
 *  - MarketBet simple (marché flexible hors combiné)
 *  - BetSlip (combiné)
 * Appelée par un endpoint admin ou un cron.
 */
export async function retryFailedCredits(): Promise<{
  retried: number;
  recovered: number;
  stillFailing: number;
}> {
  let retried = 0;
  let recovered = 0;
  let stillFailing = 0;

  // 1) Bets 1X2
  const failedBets = await prisma.bet.findMany({
    where: { status: BetStatus.CREDIT_FAILED },
    include: { user: { select: { twitchUsername: true } } },
    take: 100,
  });
  for (const bet of failedBets) {
    retried++;
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
        data: { status: BetStatus.WON, wizebotCreditTxId: credit.txId, wizebotCreditError: null },
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

  // 2) Paris simples sur marché flexible (hors combiné)
  const failedMarketBets = await prisma.marketBet.findMany({
    where: { status: BetStatus.CREDIT_FAILED, slipId: null },
    include: { user: { select: { twitchUsername: true } } },
    take: 100,
  });
  for (const mb of failedMarketBets) {
    retried++;
    if (!mb.user.twitchUsername || mb.actualPayout <= 0) {
      stillFailing++;
      continue;
    }
    const credit = await creditWizebotPoints({
      twitchUsername: mb.user.twitchUsername,
      amount: mb.actualPayout,
      reason: `CDM 26 — retry credit (market bet ${mb.id})`,
    });
    if (credit.ok) {
      await prisma.marketBet.update({
        where: { id: mb.id },
        data: { status: BetStatus.WON, wizebotCreditTxId: credit.txId, wizebotCreditError: null },
      });
      recovered++;
    } else {
      await prisma.marketBet.update({
        where: { id: mb.id },
        data: { wizebotCreditError: credit.error },
      });
      stillFailing++;
    }
  }

  // 3) Combinés (BetSlip)
  const failedSlips = await prisma.betSlip.findMany({
    where: { status: BetStatus.CREDIT_FAILED },
    include: { user: { select: { twitchUsername: true } } },
    take: 100,
  });
  for (const slip of failedSlips) {
    retried++;
    if (!slip.user.twitchUsername || slip.actualPayout <= 0) {
      stillFailing++;
      continue;
    }
    const credit = await creditWizebotPoints({
      twitchUsername: slip.user.twitchUsername,
      amount: slip.actualPayout,
      reason: `CDM 26 — retry credit (combiné ${slip.id})`,
    });
    if (credit.ok) {
      await prisma.betSlip.update({
        where: { id: slip.id },
        data: { status: BetStatus.WON, wizebotCreditTxId: credit.txId },
      });
      recovered++;
    } else {
      stillFailing++;
    }
  }

  return { retried, recovered, stillFailing };
}

/**
 * Enregistre un remboursement à rejouer : cas où le débit Wizebot a réussi mais
 * la création du pari a échoué juste après. Best-effort (ne throw jamais — on ne
 * veut surtout pas masquer l'erreur initiale du call-site). Le crédit effectif
 * est fait plus tard par `processPendingRefunds` (cron).
 */
export async function recordPendingRefund(params: {
  userId: string;
  twitchUsername: string | null;
  amount: number;
  reason: string;
  wizebotDebitTxId?: string | null;
}): Promise<void> {
  try {
    if (!params.twitchUsername || params.amount <= 0) {
      console.error('[recordPendingRefund] données insuffisantes, refund non enregistré', params);
      return;
    }
    await prisma.pendingRefund.create({
      data: {
        userId: params.userId,
        twitchUsername: params.twitchUsername,
        amount: params.amount,
        reason: params.reason,
        wizebotDebitTxId: params.wizebotDebitTxId ?? null,
      },
    });
  } catch (err) {
    // Dernier filet : on log très visiblement pour un rattrapage manuel.
    console.error('[recordPendingRefund] ÉCHEC enregistrement refund — INTERVENTION MANUELLE REQUISE', params, err);
  }
}

/**
 * Rejoue les remboursements en attente (débits Wizebot orphelins). Crédite le
 * compte Twitch et marque la ligne REFUNDED. Appelée par le cron
 * /api/admin/bets/retry-failed (à côté de retryFailedCredits).
 */
export async function processPendingRefunds(): Promise<{
  processed: number;
  refunded: number;
  stillFailing: number;
}> {
  const pending = await prisma.pendingRefund.findMany({
    where: { status: { in: [RefundStatus.PENDING, RefundStatus.FAILED] } },
    take: 100,
  });

  const tasks = pending.map(
    (r) => async (): Promise<'refunded' | 'failed' | 'skipped'> => {
      // Claim atomique : on bascule la ligne en REFUNDED de manière conditionnelle
      // (status toujours PENDING/FAILED). Si une exécution concurrente (cron qui
      // déborde sur le tick suivant, ou trigger admin simultané) l'a déjà prise,
      // `count === 0` → on ne crédite pas (évite le double-remboursement Wizebot).
      const claim = await prisma.pendingRefund.updateMany({
        where: { id: r.id, status: { in: [RefundStatus.PENDING, RefundStatus.FAILED] } },
        data: { status: RefundStatus.REFUNDED, attempts: { increment: 1 } },
      });
      if (claim.count === 0) return 'skipped';

      const credit = await creditWizebotPoints({
        twitchUsername: r.twitchUsername,
        amount: r.amount,
        reason: `CDM 26 — remboursement (${r.reason})`,
      });
      if (credit.ok) {
        await prisma.pendingRefund.update({
          where: { id: r.id },
          data: { refundTxId: credit.txId, refundedAt: new Date(), lastError: null },
        });
        return 'refunded';
      }
      // Échec : on relâche le claim (retour FAILED) pour rejeu au prochain passage.
      await prisma.pendingRefund.update({
        where: { id: r.id },
        data: { status: RefundStatus.FAILED, lastError: credit.error },
      });
      return 'failed';
    }
  );

  const results = await runWithConcurrency(tasks, SETTLEMENT_CONCURRENCY);
  let refunded = 0;
  let stillFailing = 0;
  for (const res of results) {
    if (res === 'refunded') refunded++;
    else if (res === 'failed') stillFailing++;
  }

  return { processed: pending.length, refunded, stillFailing };
}
