'use server';

import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { tournamentSchema, type TournamentInput } from '@/lib/utils/validations';
import { syncClerkUser } from '@/lib/clerk';

/**
 * Récupère tous les tournois
 */
export async function getTournaments() {
  try {
    const tournaments = await prisma.tournament.findMany({
      include: {
        groups: true,
        _count: {
          select: {
            teams: true,
            matches: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { success: true, data: tournaments };
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return { success: false, error: 'Erreur lors de la récupération des tournois' };
  }
}

/**
 * Récupère un tournoi par ID
 */
export async function getTournamentById(id: string) {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        groups: {
          include: {
            teams: true,
          },
        },
        teams: {
          include: {
            group: true,
            players: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        matches: {
          include: {
            homeTeam: true,
            awayTeam: true,
            group: true,
          },
          orderBy: {
            matchDate: 'asc',
          },
        },
        standings: {
          include: {
            team: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    if (!tournament) {
      return { success: false, error: 'Tournoi introuvable' };
    }

    return { success: true, data: tournament };
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return { success: false, error: 'Erreur lors de la récupération du tournoi' };
  }
}

/**
 * Crée un nouveau tournoi (Admin uniquement)
 */
export async function createTournament(input: TournamentInput) {
  try {
    // Vérifier l'authentification
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Synchroniser et vérifier le rôle
    const dbUser = await syncClerkUser();
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    // Valider les données
    const validated = tournamentSchema.parse(input);

    // Créer le tournoi
    const tournament = await prisma.tournament.create({
      data: {
        name: validated.name,
        startDate: validated.startDate,
        teamsPerGroup: validated.teamsPerGroup,
        playersPerTeam: validated.playersPerTeam,
        groupCount: validated.groupCount,
      },
    });

    // Créer les groupes automatiquement
    const groups = [];
    for (let i = 0; i < validated.groupCount; i++) {
      groups.push({
        name: `Groupe ${String.fromCharCode(65 + i)}`, // A, B, C, etc.
        position: i + 1,
        tournamentId: tournament.id,
      });
    }

    await prisma.group.createMany({
      data: groups,
    });

    revalidatePath('/tournaments');

    return { success: true, data: tournament };
  } catch (error) {
    console.error('Error creating tournament:', error);
    return { success: false, error: 'Erreur lors de la création du tournoi' };
  }
}

/**
 * Met à jour un tournoi (Admin uniquement)
 */
export async function updateTournament(id: string, input: Partial<TournamentInput>) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const dbUser = await syncClerkUser();
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    const tournament = await prisma.tournament.update({
      where: { id },
      data: input,
    });

    revalidatePath('/tournaments');
    revalidatePath(`/tournaments/${id}`);

    return { success: true, data: tournament };
  } catch (error) {
    console.error('Error updating tournament:', error);
    return { success: false, error: 'Erreur lors de la mise à jour du tournoi' };
  }
}

/**
 * Supprime un tournoi (Admin uniquement)
 */
export async function deleteTournament(id: string) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const dbUser = await syncClerkUser();
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    await prisma.tournament.delete({
      where: { id },
    });

    revalidatePath('/tournaments');

    return { success: true };
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return { success: false, error: 'Erreur lors de la suppression du tournoi' };
  }
}

/**
 * Marque la phase de poules comme terminée
 */
export async function completeGroupStage(tournamentId: string) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const dbUser = await syncClerkUser();
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    const tournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: { groupStageComplete: true },
    });

    revalidatePath(`/tournaments/${tournamentId}`);

    return { success: true, data: tournament };
  } catch (error) {
    console.error('Error completing group stage:', error);
    return { success: false, error: 'Erreur lors de la validation de la phase de poules' };
  }
}
