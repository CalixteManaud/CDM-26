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
import { BetOutcome, BetStatus, RefundStatus, NotificationType } from '@/prisma/prisma-client/enums';
import { creditWizebotPoints } from '@/lib/wizebot';
import { createNotifications } from '@/lib/utils/notifications';
import { computeLiveOdds, isBettingOpen, MIN_BET_POINTS, MAX_BET_POINTS, BET_EDIT_WINDOW_MS } from './odds';

// Helpers purs ré-exportés pour les imports serveur déjà en place.
// Les composants client doivent importer directement depuis `@/lib/utils/odds`
// (ce fichier-ci pull Prisma + wizebot et fuiterait dans le bundle browser).
export { computeLiveOdds, isBettingOpen, MIN_BET_POINTS, MAX_BET_POINTS, BET_EDIT_WINDOW_MS };
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

/** Champ du pool correspondant à une issue 1X2. */
function poolFieldFor(
  outcome: BetOutcome
): 'totalHomePool' | 'totalDrawPool' | 'totalAwayPool' {
  return outcome === BetOutcome.HOME_WIN
    ? 'totalHomePool'
    : outcome === BetOutcome.DRAW
      ? 'totalDrawPool'
      : 'totalAwayPool';
}

/** Vrai si un pari est encore dans sa fenêtre d'édition (3 min) ET le marché ouvert. */
export function isBetEditable(
  bet: { createdAt: Date | string; status: BetStatus },
  match: { status: string; matchDate: Date | string }
): boolean {
  return (
    bet.status === BetStatus.PENDING &&
    Date.now() < new Date(bet.createdAt).getTime() + BET_EDIT_WINDOW_MS &&
    isBettingOpen(match)
  );
}

/** Garde commune aux opérations d'édition (ownership, statut, fenêtre, marché ouvert). */
function assertBetEditable(
  bet: { userId: string; status: BetStatus; createdAt: Date },
  match: { status: string; matchDate: Date } | null,
  userId: string
) {
  if (bet.userId !== userId) {
    throw new BettingError("Ce pari ne t'appartient pas", 'FORBIDDEN');
  }
  if (bet.status !== BetStatus.PENDING) {
    throw new BettingError('Ce pari ne peut plus être modifié', 'NOT_PENDING');
  }
  if (Date.now() > bet.createdAt.getTime() + BET_EDIT_WINDOW_MS) {
    throw new BettingError('Fenêtre de modification expirée (3 min)', 'EDIT_WINDOW_EXPIRED');
  }
  if (!match || !isBettingOpen(match)) {
    throw new BettingError('Les paris sont fermés sur ce match', 'BETTING_CLOSED');
  }
}

/**
 * Annule un pari encore dans sa fenêtre de 3 min : retire la mise du pool, passe
 * le Bet en CANCELED et renvoie le montant à recréditer côté Wizebot (fait par
 * l'API route après commit). `uniqueBettors` décrémente seulement si c'était le
 * dernier pari PENDING du user sur ce match.
 */
export async function cancelBet(params: {
  userId: string;
  betId: string;
}): Promise<{ refund: number; matchId: string; outcome: BetOutcome }> {
  return prisma.$transaction(async (tx) => {
    const bet = await tx.bet.findUnique({
      where: { id: params.betId },
      include: { match: { include: { bettingPool: true } } },
    });
    if (!bet) throw new BettingError('Pari introuvable', 'BET_NOT_FOUND');

    assertBetEditable(bet, bet.match, params.userId);

    const pool = bet.match.bettingPool;
    if (pool) {
      const others = await tx.bet.count({
        where: {
          matchId: bet.matchId,
          userId: bet.userId,
          status: BetStatus.PENDING,
          id: { not: bet.id },
        },
      });
      await tx.matchBettingPool.update({
        where: { id: pool.id },
        data: {
          [poolFieldFor(bet.outcome)]: { decrement: bet.pointsWagered },
          betCount: { decrement: 1 },
          ...(others === 0 ? { uniqueBettors: { decrement: 1 } } : {}),
        },
      });
    }

    await tx.bet.update({
      where: { id: bet.id },
      data: { status: BetStatus.CANCELED },
    });

    return { refund: bet.pointsWagered, matchId: bet.matchId, outcome: bet.outcome };
  });
}

/**
 * Modifie un pari dans sa fenêtre de 3 min : change la mise et/ou l'issue.
 * Re-répartit le pool en conséquence et renvoie le `delta` de mise (signé) pour
 * que l'API route effectue le débit (delta > 0) ou le crédit (delta < 0) Wizebot.
 *
 * Le débit éventuel (augmentation) est fait AMONT par la route ; son txId est
 * passé via `addedDebitTxId`. Changer d'issue n'est autorisé que si c'est le seul
 * pari PENDING du user sur ce match (sinon on créerait une position éclatée sur
 * deux issues, ce qu'interdit la règle "no switching sides").
 */
export async function applyBetModification(params: {
  userId: string;
  betId: string;
  newOutcome: BetOutcome;
  newPoints: number;
  addedDebitTxId?: string;
}): Promise<{
  delta: number;
  oddsAtPlacement: number;
  outcome: BetOutcome;
  pointsWagered: number;
  matchId: string;
}> {
  if (!Number.isInteger(params.newPoints) || params.newPoints < MIN_BET_POINTS) {
    throw new BettingError(`Mise minimum: ${MIN_BET_POINTS} pt`, 'MIN_BET');
  }
  if (params.newPoints > MAX_BET_POINTS) {
    throw new BettingError(`Mise maximum: ${MAX_BET_POINTS} pts`, 'MAX_BET');
  }

  return prisma.$transaction(async (tx) => {
    const bet = await tx.bet.findUnique({
      where: { id: params.betId },
      include: { match: { include: { bettingPool: true } } },
    });
    if (!bet) throw new BettingError('Pari introuvable', 'BET_NOT_FOUND');

    assertBetEditable(bet, bet.match, params.userId);

    const match = bet.match;
    const pool =
      match.bettingPool ??
      (await tx.matchBettingPool.create({ data: { matchId: match.id } }));

    const outcomeChanged = params.newOutcome !== bet.outcome;
    if (outcomeChanged) {
      const others = await tx.bet.count({
        where: {
          matchId: match.id,
          userId: bet.userId,
          status: BetStatus.PENDING,
          id: { not: bet.id },
        },
      });
      if (others > 0) {
        throw new BettingError(
          "Tu as plusieurs paris sur ce match — annule les autres avant de changer d'issue.",
          'OUTCOME_LOCKED_MULTI'
        );
      }
    }

    const delta = params.newPoints - bet.pointsWagered;

    if (outcomeChanged) {
      // Déplace l'ancienne mise vers la nouvelle issue (montant éventuellement changé).
      await tx.matchBettingPool.update({
        where: { id: pool.id },
        data: {
          [poolFieldFor(bet.outcome)]: { decrement: bet.pointsWagered },
          [poolFieldFor(params.newOutcome)]: { increment: params.newPoints },
        },
      });
    } else if (delta !== 0) {
      await tx.matchBettingPool.update({
        where: { id: pool.id },
        data: { [poolFieldFor(params.newOutcome)]: { increment: delta } },
      });
    }

    const freshPool = await tx.matchBettingPool.findUnique({ where: { id: pool.id } });
    const odds = computeLiveOdds(freshPool!);
    const oddsForOutcome =
      params.newOutcome === BetOutcome.HOME_WIN
        ? odds.home
        : params.newOutcome === BetOutcome.DRAW
          ? odds.draw
          : odds.away;

    const pickedTeamId =
      params.newOutcome === BetOutcome.HOME_WIN
        ? match.homeTeamId
        : params.newOutcome === BetOutcome.AWAY_WIN
          ? match.awayTeamId
          : null;

    await tx.bet.update({
      where: { id: bet.id },
      data: {
        outcome: params.newOutcome,
        pickedTeamId,
        pointsWagered: params.newPoints,
        oddsAtPlacement: oddsForOutcome ?? 1,
        ...(params.addedDebitTxId ? { wizebotDebitTxId: params.addedDebitTxId } : {}),
      },
    });

    return {
      delta,
      oddsAtPlacement: oddsForOutcome ?? 1,
      outcome: params.newOutcome,
      pointsWagered: params.newPoints,
      matchId: match.id,
    };
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

      const loserIds: string[] = [];
      const settledAt = new Date();
      for (const bet of pendingBets) {
        if (bet.outcome === outcome) {
          // Gagnant
          // Cas dégénéré: si winningPool == 0, normalement impossible
          // (le gagnant a forcément parié sur l'issue gagnante).
          const payout =
            winningPool > 0
              ? Math.floor((bet.pointsWagered / winningPool) * distributablePool)
              : bet.pointsWagered; // fallback: rembourser

          // Crédit Wizebot fait HORS transaction (ci-dessous), on met directement
          // WON et on update wizebotCreditTxId après. Si crédit échoue → CREDIT_FAILED.
          await tx.bet.update({
            where: { id: bet.id },
            data: { status: BetStatus.WON, actualPayout: payout, settledAt },
          });
          winnersData.push({
            betId: bet.id,
            userId: bet.userId,
            payout,
            twitchUsername: bet.user.twitchUsername,
          });
        } else {
          // Perdant — batché
          loserIds.push(bet.id);
        }
      }

      // Perdants réglés en UN seul updateMany (évite N updates séquentiels qui
      // faisaient exploser le timeout de transaction sur les matchs très pariés).
      if (loserIds.length > 0) {
        await tx.bet.updateMany({
          where: { id: { in: loserIds } },
          data: { status: BetStatus.LOST, actualPayout: 0, settledAt },
        });
      }
      const losersCount = loserIds.length;

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
    },
    // Timeout large : les gros matchs (des centaines de paris) enchaînent
    // beaucoup d'updates ; le défaut Prisma (5 s) échouait silencieusement.
    { timeout: 60_000, maxWait: 15_000 }
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

  // Notifs in-app (fire-and-forget). Agrégées par user pour une seule notif par
  // personne même si elle avait cumulé plusieurs paris sur ce match.
  const byUser = new Map<string, { won: number; refunded: number }>();
  for (const w of winnersData) {
    const e = byUser.get(w.userId) ?? { won: 0, refunded: 0 };
    e.won += w.payout;
    byUser.set(w.userId, e);
  }
  for (const r of refundData) {
    const e = byUser.get(r.userId) ?? { won: 0, refunded: 0 };
    e.refunded += r.payout;
    byUser.set(r.userId, e);
  }
  const notifs = [];
  for (const [uid, sums] of byUser) {
    if (sums.won > 0) {
      notifs.push({
        userId: uid,
        type: NotificationType.BET_WON,
        title: `Pari gagné : +${sums.won.toLocaleString('fr-FR')} pts`,
        body: `Tes points ont été crédités sur ta chaîne Twitch.`,
        href: '/paris/mes-paris',
      });
    }
    if (sums.refunded > 0) {
      notifs.push({
        userId: uid,
        type: NotificationType.BET_REFUNDED,
        title: `Pari remboursé : +${sums.refunded.toLocaleString('fr-FR')} pts`,
        body: `Le match a été annulé — ta mise t'a été rendue.`,
        href: '/paris/mes-paris',
      });
    }
  }
  await createNotifications(notifs);

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
