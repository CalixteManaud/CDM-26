'use server';

import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { playerSchema, type PlayerInput } from '@/lib/utils/validations';
import { syncClerkUser } from '@/lib/clerk';

/**
 * Récupère tous les joueurs d'une équipe
 */
export async function getPlayersByTeam(teamId: string) {
  try {
    const players = await prisma.player.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            tournamentId: true,
          },
        },
      },
      orderBy: {
        jerseyNumber: 'asc',
      },
    });

    return { success: true, data: players };
  } catch (error) {
    console.error('Error fetching players:', error);
    return { success: false, error: 'Erreur lors de la récupération des joueurs' };
  }
}

/**
 * Récupère les statistiques d'un joueur
 */
export async function getPlayerStats(playerId: string) {
  try {
    const stats = await prisma.matchPlayerStats.findMany({
      where: { playerId },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
        },
      },
      orderBy: {
        match: {
          matchDate: 'desc',
        },
      },
    });

    // Calculer les totaux
    const totals = stats.reduce(
      (acc, stat) => ({
        goals: acc.goals + stat.goals,
        assists: acc.assists + stat.assists,
        yellowCards: acc.yellowCards + stat.yellowCards,
        redCards: acc.redCards + stat.redCards,
        matches: acc.matches + 1,
      }),
      { goals: 0, assists: 0, yellowCards: 0, redCards: 0, matches: 0 }
    );

    return { success: true, data: { stats, totals } };
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return { success: false, error: 'Erreur lors de la récupération des statistiques' };
  }
}

/**
 * Ajoute un joueur à une équipe (Admin ou Coach de l'équipe)
 */
export async function createPlayer(input: PlayerInput) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const dbUser = await syncClerkUser();
    if (!dbUser) {
      return { success: false, error: 'Non authentifié' };
    }

    const validated = playerSchema.parse(input);

    // Check if user can manage this team (admin OR team coach)
    const { canManageTeam } = await import('@/lib/utils/permissions');
    const canManage = await canManageTeam(dbUser.id, validated.teamId);

    if (!canManage) {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    // Vérifier que l'utilisateur n'est pas déjà dans une autre équipe du même tournoi
    const team = await prisma.team.findUnique({
      where: { id: validated.teamId },
      select: { tournamentId: true },
    });

    if (team) {
      const existingPlayer = await prisma.player.findFirst({
        where: {
          userId: validated.userId,
          team: {
            tournamentId: team.tournamentId,
          },
        },
      });

      if (existingPlayer) {
        return {
          success: false,
          error: 'Ce joueur est déjà dans une équipe de ce tournoi',
        };
      }
    }

    const player = await prisma.player.create({
      data: {
        jerseyNumber: validated.jerseyNumber,
        position: validated.position,
        userId: validated.userId,
        teamId: validated.teamId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    revalidatePath(`/teams/${validated.teamId}`);

    return { success: true, data: player };
  } catch (error) {
    console.error('Error creating player:', error);
    return { success: false, error: 'Erreur lors de l\'ajout du joueur' };
  }
}

/**
 * Met à jour un joueur (Admin uniquement)
 */
export async function updatePlayer(id: string, input: Partial<PlayerInput>) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const dbUser = await syncClerkUser();
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    const player = await prisma.player.update({
      where: { id },
      data: input,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: true,
      },
    });

    revalidatePath(`/teams/${player.teamId}`);

    return { success: true, data: player };
  } catch (error) {
    console.error('Error updating player:', error);
    return { success: false, error: 'Erreur lors de la mise à jour du joueur' };
  }
}

/**
 * Supprime un joueur (Admin ou Coach de l'équipe)
 */
export async function deletePlayer(id: string) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const dbUser = await syncClerkUser();
    if (!dbUser) {
      return { success: false, error: 'Non authentifié' };
    }

    const player = await prisma.player.findUnique({
      where: { id },
      select: { teamId: true },
    });

    if (!player) {
      return { success: false, error: 'Joueur introuvable' };
    }

    // Check if user can manage this team (admin OR team coach)
    const { canManageTeam } = await import('@/lib/utils/permissions');
    const canManage = await canManageTeam(dbUser.id, player.teamId);

    if (!canManage) {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    await prisma.player.delete({
      where: { id },
    });

    if (player) {
      revalidatePath(`/teams/${player.teamId}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting player:', error);
    return { success: false, error: 'Erreur lors de la suppression du joueur' };
  }
}
