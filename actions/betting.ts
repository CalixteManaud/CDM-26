'use server';

import prisma from '@/lib/prisma';
import { computeLiveOdds } from '@/lib/utils/betting';
import { BetStatus, MatchStatus } from '@/prisma/prisma-client/enums';

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
    const liveCutoff = new Date(Date.now() - 25 * 60 * 1000); // matchs LIVE encore bettables
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { status: MatchStatus.SCHEDULED, matchDate: { gt: new Date() } },
          { status: MatchStatus.LIVE, matchDate: { gt: liveCutoff } },
        ],
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
    const liveCutoff = new Date(Date.now() - 25 * 60 * 1000);
    const matches = await prisma.match.findMany({
      where: {
        bettingPool: { isNot: null },
        OR: [
          { status: MatchStatus.SCHEDULED, matchDate: { gt: new Date() } },
          { status: MatchStatus.LIVE, matchDate: { gt: liveCutoff } },
        ],
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
 * Indique si l'user courant a déjà parié sur un match donné.
 * Pas un verrou — juste un flag UX pour informer ("tu as déjà 2 paris sur ce match").
 */
export async function getUserBetStatusForMatch(params: { userId: string; matchId: string }) {
  try {
    const count = await prisma.bet.count({
      where: { userId: params.userId, matchId: params.matchId },
    });
    return { success: true, data: { alreadyBetSite: count > 0 } };
  } catch (error) {
    console.error('Error fetching user bet status:', error);
    return { success: false, error: 'Erreur lors de la récupération du statut' };
  }
}

/**
 * Historique de paris d'un user + stats personnelles agrégées.
 * Affiché sur /paris/mes-paris.
 */
export async function getUserBetsHistory(userId: string) {
  try {
    const [bets, agg] = await Promise.all([
      prisma.bet.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          id: true,
          outcome: true,
          pointsWagered: true,
          oddsAtPlacement: true,
          status: true,
          actualPayout: true,
          createdAt: true,
          settledAt: true,
          match: {
            select: {
              id: true,
              matchDate: true,
              status: true,
              stage: true,
              homeScore: true,
              awayScore: true,
              homeTeam: { select: TEAM_SELECT },
              awayTeam: { select: TEAM_SELECT },
              tournament: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.bet.groupBy({
        by: ['status'],
        where: { userId },
        _sum: { pointsWagered: true, actualPayout: true },
        _count: true,
      }),
    ]);

    const byStatus = new Map(agg.map((a) => [a.status, a]));
    const won = byStatus.get(BetStatus.WON);
    const lost = byStatus.get(BetStatus.LOST);
    const pending = byStatus.get(BetStatus.PENDING);
    const creditFailed = byStatus.get(BetStatus.CREDIT_FAILED);
    const voided = byStatus.get(BetStatus.VOID);

    const wonCount = (won?._count ?? 0) + (creditFailed?._count ?? 0);
    const lostCount = lost?._count ?? 0;
    const pendingCount = pending?._count ?? 0;
    const totalBets = agg.reduce((s, a) => s + a._count, 0);

    const totalWagered = agg.reduce((s, a) => s + (a._sum.pointsWagered ?? 0), 0);
    const totalWon = (won?._sum.actualPayout ?? 0) + (creditFailed?._sum.actualPayout ?? 0);
    const settledStake =
      (won?._sum.pointsWagered ?? 0) +
      (lost?._sum.pointsWagered ?? 0) +
      (creditFailed?._sum.pointsWagered ?? 0);
    const netProfit = totalWon - settledStake;
    const winRate = wonCount + lostCount > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;
    const roi = settledStake > 0 ? (netProfit / settledStake) * 100 : 0;

    return {
      success: true,
      data: {
        bets,
        stats: {
          totalBets,
          wonCount,
          lostCount,
          pendingCount,
          voidCount: voided?._count ?? 0,
          totalWagered,
          totalWon,
          netProfit,
          winRate,
          roi,
        },
      },
    };
  } catch (error) {
    console.error('Error fetching user bets history:', error);
    return { success: false, error: 'Erreur lors de la récupération de tes paris' };
  }
}

/**
 * Tournois ayant au moins un marché ouvert (longue durée).
 * Sert à la page /paris pour le bloc "paris tournoi".
 */
export async function getTournamentsWithOpenMarkets() {
  try {
    const tournaments = await prisma.tournament.findMany({
      where: {
        bettingMarkets: {
          some: { status: 'OPEN', closesAt: { gt: new Date() } },
        },
      },
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        name: true,
        startDate: true,
        bettingMarkets: {
          where: { status: 'OPEN', closesAt: { gt: new Date() } },
          select: {
            id: true,
            type: true,
            pools: { select: { totalPool: true, betCount: true } },
          },
        },
      },
    });

    const rows = tournaments.map((t) => {
      const totalPool = t.bettingMarkets.reduce(
        (s, m) => s + m.pools.reduce((a, p) => a + p.totalPool, 0),
        0
      );
      const totalBets = t.bettingMarkets.reduce(
        (s, m) => s + m.pools.reduce((a, p) => a + p.betCount, 0),
        0
      );
      return {
        id: t.id,
        name: t.name,
        startDate: t.startDate,
        marketsCount: t.bettingMarkets.length,
        marketTypes: t.bettingMarkets.map((m) => m.type),
        totalPool,
        totalBets,
      };
    });

    return { success: true, data: rows };
  } catch (error) {
    console.error('Error fetching tournaments with markets:', error);
    return { success: false, error: 'Erreur lors de la récupération des marchés tournoi' };
  }
}

/**
 * Classement des parieurs (saison).
 * Tri par bénéfice net descendant — option de tri ROI côté UI.
 */
export async function getBettorsLeaderboard(limit = 25) {
  try {
    const aggregations = await prisma.bet.groupBy({
      by: ['userId', 'status'],
      where: {
        status: { in: [BetStatus.WON, BetStatus.LOST, BetStatus.CREDIT_FAILED] },
      },
      _sum: { pointsWagered: true, actualPayout: true },
      _count: true,
    });

    type Agg = { wagered: number; won: number; wonCount: number; lostCount: number };
    const byUser = new Map<string, Agg>();

    for (const a of aggregations) {
      const u = byUser.get(a.userId) ?? { wagered: 0, won: 0, wonCount: 0, lostCount: 0 };
      u.wagered += a._sum.pointsWagered ?? 0;
      if (a.status === BetStatus.WON || a.status === BetStatus.CREDIT_FAILED) {
        u.won += a._sum.actualPayout ?? 0;
        u.wonCount += a._count;
      } else if (a.status === BetStatus.LOST) {
        u.lostCount += a._count;
      }
      byUser.set(a.userId, u);
    }

    const userIds = Array.from(byUser.keys());
    if (userIds.length === 0) {
      return { success: true, data: [] };
    }

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        twitchUsername: true,
        username: true,
        name: true,
        avatar: true,
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const rows = Array.from(byUser.entries())
      .map(([userId, agg]) => {
        const settledBets = agg.wonCount + agg.lostCount;
        const netProfit = agg.won - agg.wagered;
        const winRate = settledBets > 0 ? (agg.wonCount / settledBets) * 100 : 0;
        const roi = agg.wagered > 0 ? (netProfit / agg.wagered) * 100 : 0;
        return {
          user: userMap.get(userId) ?? null,
          wagered: agg.wagered,
          won: agg.won,
          netProfit,
          winRate,
          roi,
          totalBets: settledBets,
          wonCount: agg.wonCount,
          lostCount: agg.lostCount,
        };
      })
      .filter((r) => r.user && r.totalBets > 0);

    rows.sort((a, b) => b.netProfit - a.netProfit);

    return { success: true, data: rows.slice(0, limit) };
  } catch (error) {
    console.error('Error fetching bettors leaderboard:', error);
    return { success: false, error: 'Erreur lors du calcul du classement' };
  }
}
