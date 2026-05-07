'use server';

import prisma from '@/lib/prisma';
import { computeLiveOdds } from '@/lib/utils/betting';
import { BetSource, BetStatus, MatchStatus } from '@/prisma/prisma-client/enums';

const TEAM_SELECT = {
  id: true,
  name: true,
  shortName: true,
  logo: true,
} as const;

const POOL_SELECT = {
  totalHomePool: true,
  totalDrawPool: true,
  totalAwayPool: true,
  betCount: true,
  uniqueBettors: true,
  housePercentage: true,
} as const;

/**
 * Tous les matchs ouverts aux paris (status SCHEDULED + matchDate dans le futur).
 * Inclut le pool agrégé pour calculer les cotes côté front.
 */
export async function getOpenBettingMatches() {
  try {
    const matches = await prisma.match.findMany({
      where: {
        status: MatchStatus.SCHEDULED,
        matchDate: { gt: new Date() },
      },
      orderBy: { matchDate: 'asc' },
      select: {
        id: true,
        matchDate: true,
        stage: true,
        status: true,
        twitchUrl: true,
        homeTeam: { select: TEAM_SELECT },
        awayTeam: { select: TEAM_SELECT },
        tournament: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
        bettingPool: { select: POOL_SELECT },
      },
    });

    return { success: true, data: matches };
  } catch (error) {
    console.error('Error fetching open betting matches:', error);
    return { success: false, error: 'Erreur lors de la récupération des paris' };
  }
}

/**
 * Top N des plus grosses cotes en direct (toutes issues confondues),
 * uniquement sur les matchs encore ouverts. Trié desc.
 */
export async function getTopLiveOdds(limit = 5) {
  try {
    const matches = await prisma.match.findMany({
      where: {
        status: MatchStatus.SCHEDULED,
        matchDate: { gt: new Date() },
        bettingPool: { isNot: null },
      },
      select: {
        id: true,
        matchDate: true,
        homeTeam: { select: TEAM_SELECT },
        awayTeam: { select: TEAM_SELECT },
        tournament: { select: { id: true, name: true } },
        bettingPool: { select: POOL_SELECT },
      },
    });

    type Row = {
      matchId: string;
      matchDate: Date;
      tournament: { id: string; name: string };
      homeTeam: typeof matches[number]['homeTeam'];
      awayTeam: typeof matches[number]['awayTeam'];
      outcome: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN';
      label: string;
      odds: number;
    };

    const rows: Row[] = [];
    for (const m of matches) {
      if (!m.bettingPool) continue;
      const odds = computeLiveOdds(m.bettingPool);
      const entries: Array<[Row['outcome'], string, number | null]> = [
        ['HOME_WIN', m.homeTeam.shortName, odds.home],
        ['DRAW', 'Nul', odds.draw],
        ['AWAY_WIN', m.awayTeam.shortName, odds.away],
      ];
      for (const [outcome, label, value] of entries) {
        if (value == null) continue;
        rows.push({
          matchId: m.id,
          matchDate: m.matchDate,
          tournament: m.tournament,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          outcome,
          label,
          odds: value,
        });
      }
    }

    rows.sort((a, b) => b.odds - a.odds);
    return { success: true, data: rows.slice(0, limit) };
  } catch (error) {
    console.error('Error fetching top live odds:', error);
    return { success: false, error: 'Erreur lors du calcul des cotes' };
  }
}

/**
 * Flux des derniers paris placés. Anonymisé via twitchUsername (si absent → "anonyme").
 */
export async function getRecentBets(limit = 12) {
  try {
    const bets = await prisma.bet.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        outcome: true,
        pointsWagered: true,
        oddsAtPlacement: true,
        status: true,
        createdAt: true,
        user: { select: { twitchUsername: true, username: true } },
        match: {
          select: {
            id: true,
            matchDate: true,
            homeTeam: { select: { shortName: true } },
            awayTeam: { select: { shortName: true } },
          },
        },
      },
    });

    return { success: true, data: bets };
  } catch (error) {
    console.error('Error fetching recent bets:', error);
    return { success: false, error: 'Erreur lors de la récupération du flux' };
  }
}

/**
 * Stats globales pour le hero de la page paris.
 */
export async function getGlobalBettingStats() {
  try {
    const [pools, betsAggregate, uniqueBettorsAgg] = await Promise.all([
      prisma.matchBettingPool.aggregate({
        _sum: {
          totalHomePool: true,
          totalDrawPool: true,
          totalAwayPool: true,
          betCount: true,
        },
      }),
      prisma.bet.count({ where: { status: BetStatus.PENDING } }),
      prisma.bet.findMany({
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    const totalWagered =
      (pools._sum.totalHomePool ?? 0) +
      (pools._sum.totalDrawPool ?? 0) +
      (pools._sum.totalAwayPool ?? 0);

    return {
      success: true,
      data: {
        totalWagered,
        totalBets: pools._sum.betCount ?? 0,
        pendingBets: betsAggregate,
        uniqueBettors: uniqueBettorsAgg.length,
      },
    };
  } catch (error) {
    console.error('Error fetching global betting stats:', error);
    return { success: false, error: 'Erreur lors du calcul des stats' };
  }
}

/**
 * Détail d'un match pour le widget de paris (page match).
 * Renvoie le pool, les cotes live, les derniers paris sur ce match.
 */
export async function getMatchBettingDetails(matchId: string) {
  try {
    const [match, recentBets] = await Promise.all([
      prisma.match.findUnique({
        where: { id: matchId },
        select: {
          id: true,
          matchDate: true,
          status: true,
          homeTeam: { select: TEAM_SELECT },
          awayTeam: { select: TEAM_SELECT },
          bettingPool: { select: POOL_SELECT },
        },
      }),
      prisma.bet.findMany({
        where: { matchId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          outcome: true,
          pointsWagered: true,
          oddsAtPlacement: true,
          status: true,
          createdAt: true,
          user: { select: { twitchUsername: true, username: true } },
        },
      }),
    ]);

    if (!match) return { success: false, error: 'Match introuvable' };

    return {
      success: true,
      data: { match, recentBets },
    };
  } catch (error) {
    console.error('Error fetching match betting details:', error);
    return { success: false, error: 'Erreur lors de la récupération' };
  }
}

/**
 * Statut de pari de l'user courant sur un match donné.
 * Sert à savoir si le verrou Twitch est actif (cas où l'user a déjà parié via
 * le chat) ou si on autorise un pari supplémentaire via le site.
 */
export async function getUserBetStatusForMatch(params: { userId: string; matchId: string }) {
  try {
    const bets = await prisma.bet.findMany({
      where: { userId: params.userId, matchId: params.matchId },
      select: { source: true },
    });

    const blockedByTwitch = bets.some((b) => b.source === BetSource.WIZEBOT);
    const alreadyBetSite = bets.some((b) => b.source === BetSource.SITE);

    return { success: true, data: { blockedByTwitch, alreadyBetSite } };
  } catch (error) {
    console.error('Error fetching user bet status:', error);
    return { success: false, error: 'Erreur lors de la récupération du statut' };
  }
}
