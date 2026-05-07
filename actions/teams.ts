'use server';

import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { teamSchema, type TeamInput } from '@/lib/utils/validations';
import { syncClerkUser } from '@/lib/clerk';
import { canManageTeam } from '@/lib/utils/permissions';

/**
 * Récupère toutes les équipes
 */
export async function getAllTeams() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        group: true,
        tournament: {
          select: {
            id: true,
            name: true,
            startDate: true,
          },
        },
        players: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
              },
            },
          },
        },
        standings: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { success: true, data: teams };
  } catch (error) {
    console.error('Error fetching all teams:', error);
    return { success: false, error: 'Erreur lors de la récupération des équipes' };
  }
}

/**
 * Récupère toutes les équipes d'un tournoi
 */
export async function getTeamsByTournament(tournamentId: string) {
  try {
    const teams = await prisma.team.findMany({
      where: { tournamentId },
      include: {
        group: true,
        players: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
              },
            },
          },
        },
        standings: {
          where: { tournamentId },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return { success: true, data: teams };
  } catch (error) {
    console.error('Error fetching teams:', error);
    return { success: false, error: 'Erreur lors de la récupération des équipes' };
  }
}

/**
 * Récupère une équipe par ID
 */
export async function getTeamById(id: string) {
  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        group: true,
        tournament: true,
        coach: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
        },
        players: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
              },
            },
            stats: {
              include: {
                match: {
                  include: {
                    homeTeam: true,
                    awayTeam: true,
                  },
                },
              },
            },
          },
        },
        standings: true,
      },
    });

    if (!team) {
      return { success: false, error: 'Équipe introuvable' };
    }

    return { success: true, data: team };
  } catch (error) {
    console.error('Error fetching team:', error);
    return { success: false, error: 'Erreur lors de la récupération de l\'équipe' };
  }
}

/**
 * Crée une nouvelle équipe (Admin uniquement)
 */
export async function createTeam(input: TeamInput) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const dbUser = await syncClerkUser();
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    const validated = teamSchema.parse(input);

    const team = await prisma.team.create({
      data: {
        name: validated.name,
        shortName: validated.shortName,
        logo: validated.logo || null,
        tournamentId: validated.tournamentId,
        groupId: validated.groupId || null,
      },
    });

    revalidatePath(`/tournaments/${validated.tournamentId}`);

    return { success: true, data: team };
  } catch (error) {
    console.error('Error creating team:', error);
    return { success: false, error: 'Erreur lors de la création de l\'équipe' };
  }
}

/**
 * Met à jour une équipe (Admin du site OU coach de l'équipe)
 */
export async function updateTeam(id: string, input: Partial<TeamInput>) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const dbUser = await syncClerkUser();
    if (!dbUser) {
      return { success: false, error: 'Non authentifié' };
    }

    // Check if user can manage this team (site admin OR team coach)
    const canManage = await canManageTeam(dbUser.id, id);
    if (!canManage) {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    const team = await prisma.team.update({
      where: { id },
      data: input,
      include: {
        tournament: true,
      },
    });

    revalidatePath(`/tournaments/${team.tournamentId}`);

    return { success: true, data: team };
  } catch (error) {
    console.error('Error updating team:', error);
    return { success: false, error: 'Erreur lors de la mise à jour de l\'équipe' };
  }
}

/**
 * Supprime une équipe (Admin uniquement)
 */
export async function deleteTeam(id: string) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const dbUser = await syncClerkUser();
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    const team = await prisma.team.findUnique({
      where: { id },
      select: { tournamentId: true },
    });

    await prisma.team.delete({
      where: { id },
    });

    if (team) {
      revalidatePath(`/tournaments/${team.tournamentId}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting team:', error);
    return { success: false, error: 'Erreur lors de la suppression de l\'équipe' };
  }
}
