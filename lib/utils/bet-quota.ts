/**
 * Agrégation DB des points déjà engagés par un user "aujourd'hui" (depuis minuit
 * Paris) et vérification des quotas jour / match avant placement d'un pari.
 *
 * Server-only (importe Prisma). Branché AVANT le débit Wizebot dans les 3 entrées :
 *  - 1X2      : pages/api/bets/place.ts
 *  - marché   : actions/markets.ts → placeMarketBet
 *  - combiné  : actions/markets.ts → placeBetSlip
 */

import prisma from '@/lib/prisma';
import {
  DAILY_POINT_QUOTA,
  PER_MATCH_POINT_QUOTA,
  quotaDayStart,
} from './quota';

export { DAILY_POINT_QUOTA, PER_MATCH_POINT_QUOTA, quotaDayStart };

/** Points à ajouter aux compteurs si le pari est accepté. */
export type QuotaAdditions = {
  /** Mise totale débitée sur Wizebot (compteur journalier). */
  daily: number;
  /** Mise imputée à chaque match (clé = matchId). Vide pour un marché tournoi. */
  perMatch: Record<string, number>;
};

export type QuotaCheck =
  | { ok: true }
  | {
      ok: false;
      code: 'DAILY_QUOTA' | 'MATCH_QUOTA';
      error: string;
      remaining: number;
    };

const fr = (n: number) => n.toLocaleString('fr-FR');

/**
 * Points déjà engagés depuis minuit Paris : total journalier + détail par match.
 * - Journalier : Σ Bet + Σ MarketBet hors combiné + Σ BetSlip.totalStake (montant
 *   réellement débité pour les combinés).
 * - Par match : Σ Bet(matchId) + Σ MarketBet rattachés à un marché de ce match
 *   (jambes de combiné incluses).
 */
export async function getUserSpentToday(
  userId: string
): Promise<{ daily: number; perMatch: Map<string, number> }> {
  const since = quotaDayStart();

  const [bets, marketBets, slipAgg] = await Promise.all([
    prisma.bet.groupBy({
      by: ['matchId'],
      where: { userId, createdAt: { gte: since } },
      _sum: { pointsWagered: true },
    }),
    prisma.marketBet.findMany({
      where: { userId, createdAt: { gte: since } },
      select: {
        pointsWagered: true,
        slipId: true,
        market: { select: { matchId: true } },
      },
    }),
    prisma.betSlip.aggregate({
      where: { userId, createdAt: { gte: since } },
      _sum: { totalStake: true },
    }),
  ]);

  const perMatch = new Map<string, number>();
  let daily = 0;

  // 1X2
  for (const b of bets) {
    const amt = b._sum.pointsWagered ?? 0;
    daily += amt;
    if (b.matchId) perMatch.set(b.matchId, (perMatch.get(b.matchId) ?? 0) + amt);
  }

  // Marchés flexibles. Les jambes de combiné comptent au match mais PAS au
  // journalier (déjà couvert par BetSlip.totalStake) pour éviter le double comptage.
  for (const mb of marketBets) {
    if (!mb.slipId) daily += mb.pointsWagered;
    const matchId = mb.market.matchId;
    if (matchId) perMatch.set(matchId, (perMatch.get(matchId) ?? 0) + mb.pointsWagered);
  }

  // Combinés (montant total débité)
  daily += slipAgg._sum.totalStake ?? 0;

  return { daily, perMatch };
}

/**
 * Vérifie qu'un nouveau pari respecte les quotas jour et match. À appeler AVANT
 * le débit Wizebot. Ne mute rien.
 */
export async function checkBetWithinQuota(
  userId: string,
  add: QuotaAdditions
): Promise<QuotaCheck> {
  const { daily, perMatch } = await getUserSpentToday(userId);

  if (daily + add.daily > DAILY_POINT_QUOTA) {
    const remaining = Math.max(0, DAILY_POINT_QUOTA - daily);
    return {
      ok: false,
      code: 'DAILY_QUOTA',
      remaining,
      error:
        remaining > 0
          ? `Quota journalier : il te reste ${fr(remaining)} pts aujourd'hui (max ${fr(DAILY_POINT_QUOTA)} pts/jour), cette mise les dépasse.`
          : `Quota journalier atteint : tu as déjà engagé ${fr(DAILY_POINT_QUOTA)} pts aujourd'hui. Réessaie demain.`,
    };
  }

  for (const [matchId, amt] of Object.entries(add.perMatch)) {
    const already = perMatch.get(matchId) ?? 0;
    if (already + amt > PER_MATCH_POINT_QUOTA) {
      const remaining = Math.max(0, PER_MATCH_POINT_QUOTA - already);
      return {
        ok: false,
        code: 'MATCH_QUOTA',
        remaining,
        error:
          remaining > 0
            ? `Quota sur ce match : il te reste ${fr(remaining)} pts (max ${fr(PER_MATCH_POINT_QUOTA)} pts/match), cette mise les dépasse.`
            : `Quota atteint sur ce match : tu as déjà engagé ${fr(PER_MATCH_POINT_QUOTA)} pts dessus.`,
      };
    }
  }

  return { ok: true };
}
