'use server';

import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { tournamentSchema, type TournamentInput } from '@/lib/utils/validations';
import { syncClerkUser } from '@/lib/clerk';

/**
 * Récupère tous les tournois.
 *
 * Par défaut, ramène uniquement les tournois actifs (non archivés).
 * Passer `{ includeArchived: true }` pour récupérer les archivés en plus
 * (utilisé par la listing page qui doit afficher tous les compteurs).
 */
export async function getTournaments(options?: { includeArchived?: boolean }) {
  try {
    const tournaments = await prisma.tournament.findMany({
      where: options?.includeArchived ? undefined : { archivedAt: null },
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
 * Archive ou désarchive un tournoi (Admin uniquement).
 * Non destructif : on positionne juste archivedAt (= now ou null).
 */
export async function archiveTournament(id: string, archive: boolean) {
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
      data: { archivedAt: archive ? new Date() : null },
    });

    revalidatePath('/tournaments');
    revalidatePath(`/tournaments/${id}`);

    return { success: true, data: tournament };
  } catch (error) {
    console.error('Error toggling tournament archive:', error);
    return {
      success: false,
      error: archive
        ? "Erreur lors de l'archivage du tournoi"
        : 'Erreur lors de la désarchivage du tournoi',
    };
  }
}

/**
 * Importe les équipes (et leurs joueurs + coach) d'un tournoi source vers un
 * tournoi cible vide. Non destructif côté source.
 *
 * Si `teamIds` est fourni, seules ces équipes-là sont importées (sinon toutes).
 *
 * Précondition : le tournoi cible ne doit avoir aucune équipe (sinon doublons
 * potentiels sur `Player.@@unique([teamId, jerseyNumber])` et confusion sur les
 * groupes). Les Team clonées sont assignées à `groupId = null` — l'admin doit
 * ensuite faire la répartition dans les groupes du tournoi cible.
 *
 * NOTE : pas de check `currentUser()` ici — `currentUser()` ne marche pas en
 * Pages Router API route context (besoin du request scope RSC). L'auth admin
 * est validée en amont par l'API route appelante (`pages/api/.../import-teams`).
 */
export async function importTeamsFromTournament(
  targetId: string,
  sourceId: string,
  teamIds?: string[]
) {
  try {
    if (targetId === sourceId) {
      return { success: false, error: 'Le tournoi source et cible doivent être différents' };
    }

    const [target, source] = await Promise.all([
      prisma.tournament.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          groupCount: true,
          teamsPerGroup: true,
          teams: { select: { name: true, shortName: true } },
        },
      }),
      prisma.tournament.findUnique({
        where: { id: sourceId },
        include: {
          teams: {
            include: {
              players: true,
            },
          },
        },
      }),
    ]);

    if (!target) return { success: false, error: 'Tournoi cible introuvable' };
    if (!source) return { success: false, error: 'Tournoi source introuvable' };

    if (source.teams.length === 0) {
      return { success: false, error: 'Le tournoi source ne contient aucune équipe' };
    }

    // Capacité du tournoi cible = nb de groupes × équipes par groupe.
    const capacity = target.groupCount * target.teamsPerGroup;
    const remaining = capacity - target.teams.length;
    if (remaining <= 0) {
      return {
        success: false,
        error: `Tournoi complet : ${target.teams.length}/${capacity} équipes. Aucune place disponible.`,
      };
    }

    const filteredTeams =
      teamIds && teamIds.length > 0
        ? source.teams.filter((t) => teamIds.includes(t.id))
        : source.teams;

    if (filteredTeams.length === 0) {
      return { success: false, error: 'Aucune équipe sélectionnée à importer' };
    }

    // Déduplication : on ne réimporte pas une équipe déjà présente dans la cible
    // (même code court — clé unique — OU même nom, insensible à la casse).
    const norm = (s: string) => s.trim().toLowerCase();
    const existingNames = new Set(target.teams.map((t) => norm(t.name)));
    const existingShorts = new Set(target.teams.map((t) => norm(t.shortName)));
    const toImport = filteredTeams.filter(
      (t) => !existingShorts.has(norm(t.shortName)) && !existingNames.has(norm(t.name))
    );
    const skipped = filteredTeams.length - toImport.length;

    if (toImport.length === 0) {
      return {
        success: false,
        error: 'Toutes les équipes sélectionnées sont déjà présentes dans ce tournoi.',
      };
    }

    if (toImport.length > remaining) {
      return {
        success: false,
        error: `Plus assez de place : ${remaining} place${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}, tu essaies d'importer ${toImport.length} équipe${toImport.length > 1 ? 's' : ''}.`,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      let teamsCreated = 0;
      let playersCreated = 0;

      for (const srcTeam of toImport) {
        const newTeam = await tx.team.create({
          data: {
            name: srcTeam.name,
            shortName: srcTeam.shortName,
            logo: srcTeam.logo,
            coachUserId: srcTeam.coachUserId,
            tournamentId: targetId,
            // groupId: null → l'admin assignera ensuite dans les groupes du target
          },
        });
        teamsCreated++;

        if (srcTeam.players.length > 0) {
          await tx.player.createMany({
            data: srcTeam.players.map((p) => ({
              jerseyNumber: p.jerseyNumber,
              position: p.position,
              userId: p.userId,
              teamId: newTeam.id,
            })),
          });
          playersCreated += srcTeam.players.length;
        }
      }

      return { teamsCreated, playersCreated };
    });

    // `skipped` = équipes ignorées car déjà présentes dans la cible.
    const data = { ...result, skipped };

    // Pas de revalidatePath ici : il vient du cache App Router et lève
    // "Invariant: static generation store missing" quand l'action est appelée
    // depuis une API route Pages Router. Le client refresh via `onDone` dans
    // le dialog d'import.

    return { success: true, data };
  } catch (error) {
    console.error('Error importing teams:', error);
    return {
      success: false,
      error:
        error instanceof Error && error.message.includes('Unique')
          ? 'Conflit lors de la copie (un joueur a déjà ce numéro dans une équipe existante)'
          : "Erreur lors de l'import des équipes",
    };
  }
}

/**
 * Applique un tirage au sort : assigne chaque équipe à un groupe en une transaction.
 *
 * Préconditions :
 *  - Tournoi non archivé.
 *  - Aucun match `GROUP` ne doit déjà exister (sinon les assignations seraient
 *    incohérentes avec le calendrier déjà généré).
 *  - Chaque `teamId` et `groupId` doit appartenir au tournoi cible.
 *
 * Auth déléguée à l'API route (cf. `currentUser()` ne marche pas en Pages Router).
 */
export async function applyTournamentDraw(
  tournamentId: string,
  assignments: Array<{ teamId: string; groupId: string }>
) {
  try {
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return { success: false, error: 'Aucune assignation fournie' };
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        archivedAt: true,
        groups: { select: { id: true } },
        teams: { select: { id: true } },
      },
    });

    if (!tournament) return { success: false, error: 'Tournoi introuvable' };
    if (tournament.archivedAt) {
      return { success: false, error: 'Tournoi archivé — désarchive-le d\'abord' };
    }

    const existingMatches = await prisma.match.count({
      where: { tournamentId, stage: 'GROUP' },
    });
    if (existingMatches > 0) {
      return {
        success: false,
        error: 'Des matchs de poules existent déjà — supprime-les avant de relancer un tirage.',
      };
    }

    const validGroupIds = new Set(tournament.groups.map((g) => g.id));
    const validTeamIds = new Set(tournament.teams.map((t) => t.id));
    const seenTeamIds = new Set<string>();

    for (const { teamId, groupId } of assignments) {
      if (!validTeamIds.has(teamId)) {
        return { success: false, error: `Équipe ${teamId} hors du tournoi` };
      }
      if (!validGroupIds.has(groupId)) {
        return { success: false, error: `Groupe ${groupId} hors du tournoi` };
      }
      if (seenTeamIds.has(teamId)) {
        return { success: false, error: 'Une équipe est assignée plusieurs fois' };
      }
      seenTeamIds.add(teamId);
    }

    await prisma.$transaction(
      assignments.map((a) =>
        prisma.team.update({
          where: { id: a.teamId },
          data: { groupId: a.groupId },
        })
      )
    );

    return { success: true, data: { teamsAssigned: assignments.length } };
  } catch (error) {
    console.error('Error applying draw:', error);
    return { success: false, error: 'Erreur lors de l\'application du tirage' };
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
