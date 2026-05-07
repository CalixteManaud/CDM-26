'use server';

import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { matchResultSchema, type MatchResultInput } from '@/lib/utils/validations';
import { syncClerkUser } from '@/lib/clerk';
import { recalculateStandings } from '@/lib/utils/standings';
import { generateKnockoutBracket } from '@/lib/utils/bracket-generator';
import { MatchStage, MatchStatus } from '@/prisma/prisma-client/enums';

/**
 * Récupère tous les matchs
 */
export async function getAllMatches() {
  try {
    const matches = await prisma.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
        group: true,
        winnerTeam: true,
        tournament: {
          select: {
            id: true,
            name: true,
            startDate: true,
          },
        },
      },
      orderBy: {
        matchDate: 'desc',
      },
    });

    return { success: true, data: matches };
  } catch (error) {
    console.error('Error fetching all matches:', error);
    return { success: false, error: 'Erreur lors de la récupération des matchs' };
  }
}

/**
 * Récupère tous les matchs d'un tournoi
 */
export async function getMatchesByTournament(tournamentId: string) {
  try {
    const matches = await prisma.match.findMany({
      where: { tournamentId },
      include: {
        homeTeam: true,
        awayTeam: true,
        group: true,
        winnerTeam: true,
      },
      orderBy: {
        matchDate: 'asc',
      },
    });

    return { success: true, data: matches };
  } catch (error) {
    console.error('Error fetching matches:', error);
    return { success: false, error: 'Erreur lors de la récupération des matchs' };
  }
}

/**
 * Récupère un match par ID
 */
export async function getMatchById(id: string) {
  try {
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: {
          include: {
            coach: {
              select: {
                id: true,
                clerkId: true,
                name: true,
              },
            },
            players: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        awayTeam: {
          include: {
            coach: {
              select: {
                id: true,
                clerkId: true,
                name: true,
              },
            },
            players: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        group: true,
        tournament: true,
        winnerTeam: true,
        playerStats: {
          include: {
            player: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!match) {
      return { success: false, error: 'Match introuvable' };
    }

    return { success: true, data: match };
  } catch (error) {
    console.error('Error fetching match:', error);
    return { success: false, error: 'Erreur lors de la récupération du match' };
  }
}

/**
 * Soumet le résultat d'un match (Admin uniquement)
 * Recalcule automatiquement les standings si c'est un match de poule
 */
export async function submitMatchResult(matchId: string, input: MatchResultInput) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const dbUser = await syncClerkUser();
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    const validated = matchResultSchema.parse(input);

    // Récupérer le match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { tournament: true },
    });

    if (!match) {
      return { success: false, error: 'Match introuvable' };
    }

    // Déterminer le vainqueur
    let winnerId: string | null = null;
    if (validated.homeScore > validated.awayScore) {
      winnerId = match.homeTeamId;
    } else if (validated.awayScore > validated.homeScore) {
      winnerId = match.awayTeamId;
    }
    // Si égalité en phase de poule, pas de vainqueur
    // Si égalité en knockout, gérer les penalties (à implémenter)

    // Transaction pour mettre à jour le match et les stats
    const result = await prisma.$transaction(async (tx) => {
      // Mettre à jour le match
      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          homeScore: validated.homeScore,
          awayScore: validated.awayScore,
          status: MatchStatus.FINISHED,
          winnerTeamId: winnerId,
        },
      });

      // Supprimer les anciennes stats (si re-soumission)
      await tx.matchPlayerStats.deleteMany({
        where: { matchId },
      });

      // Créer les nouvelles stats
      if (validated.playerStats && validated.playerStats.length > 0) {
        await tx.matchPlayerStats.createMany({
          data: validated.playerStats.map((stat) => ({
            matchId,
            playerId: stat.playerId,
            goals: stat.goals,
            assists: stat.assists,
            yellowCards: stat.yellowCards,
            redCards: stat.redCards,
          })),
        });
      }

      return updatedMatch;
    });

    // Si c'est un match de poule, recalculer les standings
    if (match.stage === 'GROUP') {
      await recalculateStandings(match.tournamentId);
    }

    revalidatePath(`/tournaments/${match.tournamentId}`);
    revalidatePath(`/matches/${matchId}`);

    return { success: true, data: result };
  } catch (error) {
    console.error('Error submitting match result:', error);
    return { success: false, error: 'Erreur lors de la soumission du résultat' };
  }
}

/**
 * Génère le bracket d'élimination (Admin uniquement)
 */
export async function generateBracket(tournamentId: string) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const dbUser = await syncClerkUser();
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    const result = await generateKnockoutBracket(tournamentId);

    revalidatePath(`/tournaments/${tournamentId}`);

    return { success: true, data: result };
  } catch (error: unknown) {
    console.error('Error generating bracket:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la génération du bracket';
    return { success: false, error: errorMessage };
  }
}

/**
 * Crée un match (Admin uniquement)
 */
export async function createMatch(data: {
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  stage: MatchStage;
  matchDate: Date;
  groupId?: string;
}) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const dbUser = await syncClerkUser();
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    const match = await prisma.match.create({
      data: {
        tournamentId: data.tournamentId,
        homeTeamId: data.homeTeamId,
        awayTeamId: data.awayTeamId,
        stage: data.stage as MatchStage,
        matchDate: data.matchDate,
        groupId: data.groupId || null,
        status: MatchStatus.SCHEDULED,
      },
    });

    revalidatePath(`/tournaments/${data.tournamentId}`);

    return { success: true, data: match };
  } catch (error) {
    console.error('Error creating match:', error);
    return { success: false, error: 'Erreur lors de la création du match' };
  }
}

/**
 * Supprime un match (Admin uniquement)
 */
export async function deleteMatch(id: string) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const dbUser = await syncClerkUser();
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    const match = await prisma.match.findUnique({
      where: { id },
      select: { tournamentId: true },
    });

    await prisma.match.delete({
      where: { id },
    });

    if (match) {
      revalidatePath(`/tournaments/${match.tournamentId}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting match:', error);
    return { success: false, error: 'Erreur lors de la suppression du match' };
  }
}
