'use server';

import prisma from '@/lib/prisma';
import { getGroupStandings, getTournamentStandings } from '@/lib/utils/standings';

/**
 * Récupère le classement d'un groupe
 */
export async function getStandingsByGroup(tournamentId: string, groupId: string) {
  try {
    const standings = await getGroupStandings(tournamentId, groupId);
    return { success: true, data: standings };
  } catch (error) {
    console.error('Error fetching group standings:', error);
    return { success: false, error: 'Erreur lors de la récupération du classement' };
  }
}

/**
 * Récupère le classement général d'un tournoi
 */
export async function getStandingsByTournament(tournamentId: string) {
  try {
    const standings = await getTournamentStandings(tournamentId);
    return { success: true, data: standings };
  } catch (error) {
    console.error('Error fetching tournament standings:', error);
    return { success: false, error: 'Erreur lors de la récupération du classement' };
  }
}

/**
 * Récupère les meilleurs buteurs d'un tournoi
 */
export async function getTopScorers(tournamentId: string, limit: number = 10) {
  try {
    // Récupérer tous les joueurs avec leurs stats pour ce tournoi
    const playersWithStats = await prisma.player.findMany({
      where: {
        team: {
          tournamentId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            shortName: true,
          },
        },
        stats: {
          where: {
            match: {
              tournamentId,
              status: 'FINISHED',
            },
          },
        },
      },
    });

    // Calculer les totaux pour chaque joueur
    const scorers = playersWithStats
      .map((player) => {
        const totals = player.stats.reduce(
          (acc, stat) => ({
            goals: acc.goals + stat.goals,
            assists: acc.assists + stat.assists,
            yellowCards: acc.yellowCards + stat.yellowCards,
            redCards: acc.redCards + stat.redCards,
          }),
          { goals: 0, assists: 0, yellowCards: 0, redCards: 0 }
        );

        return {
          player: {
            id: player.id,
            jerseyNumber: player.jerseyNumber,
            position: player.position,
            user: player.user,
          },
          team: player.team,
          goals: totals.goals,
          assists: totals.assists,
          yellowCards: totals.yellowCards,
          redCards: totals.redCards,
          matches: player.stats.length,
        };
      })
      .filter((scorer) => scorer.goals > 0) // Seulement ceux qui ont marqué
      .sort((a, b) => {
        // Trier par buts (desc), puis par passes (desc)
        if (b.goals !== a.goals) return b.goals - a.goals;
        return b.assists - a.assists;
      })
      .slice(0, limit);

    return { success: true, data: scorers };
  } catch (error) {
    console.error('Error fetching top scorers:', error);
    return { success: false, error: 'Erreur lors de la récupération des meilleurs buteurs' };
  }
}

/**
 * Récupère les meilleurs passeurs d'un tournoi
 */
export async function getTopAssisters(tournamentId: string, limit: number = 10) {
  try {
    const playersWithStats = await prisma.player.findMany({
      where: {
        team: {
          tournamentId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            shortName: true,
          },
        },
        stats: {
          where: {
            match: {
              tournamentId,
              status: 'FINISHED',
            },
          },
        },
      },
    });

    const assisters = playersWithStats
      .map((player) => {
        const totals = player.stats.reduce(
          (acc, stat) => ({
            goals: acc.goals + stat.goals,
            assists: acc.assists + stat.assists,
            yellowCards: acc.yellowCards + stat.yellowCards,
            redCards: acc.redCards + stat.redCards,
          }),
          { goals: 0, assists: 0, yellowCards: 0, redCards: 0 }
        );

        return {
          player: {
            id: player.id,
            jerseyNumber: player.jerseyNumber,
            position: player.position,
            user: player.user,
          },
          team: player.team,
          goals: totals.goals,
          assists: totals.assists,
          yellowCards: totals.yellowCards,
          redCards: totals.redCards,
          matches: player.stats.length,
        };
      })
      .filter((assister) => assister.assists > 0)
      .sort((a, b) => {
        if (b.assists !== a.assists) return b.assists - a.assists;
        return b.goals - a.goals;
      })
      .slice(0, limit);

    return { success: true, data: assisters };
  } catch (error) {
    console.error('Error fetching top assisters:', error);
    return { success: false, error: 'Erreur lors de la récupération des meilleurs passeurs' };
  }
}
