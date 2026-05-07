import prisma from '../prisma';
import { MatchStage, MatchStatus } from '@/prisma/prisma-client/enums';

/**
 * Génère tous les matchs de groupe pour un tournoi (round-robin)
 * Chaque équipe joue contre chaque autre équipe de son groupe
 */
export async function generateGroupMatches(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      groups: {
        include: {
          teams: true,
        },
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!tournament) {
    throw new Error('Tournoi introuvable');
  }

  // Vérifier qu'il n'y a pas déjà de matchs de groupe
  const existingMatches = await prisma.match.count({
    where: {
      tournamentId,
      stage: 'GROUP',
    },
  });

  if (existingMatches > 0) {
    throw new Error('Les matchs de groupe existent déjà pour ce tournoi');
  }

  const allMatches: Array<{
    tournamentId: string;
    groupId: string;
    stage: MatchStage;
    status: MatchStatus;
    homeTeamId: string;
    awayTeamId: string;
    matchDate: Date;
  }> = [];
  let matchDateOffset = 0;

  // Générer les matchs pour chaque groupe
  for (const group of tournament.groups) {
    const teams = group.teams;

    if (teams.length < 2) {
      console.warn(`Groupe ${group.name} a moins de 2 équipes, skipping`);
      continue;
    }

    // Générer tous les matchs possibles (round-robin)
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        allMatches.push({
          tournamentId,
          groupId: group.id,
          stage: MatchStage.GROUP,
          status: MatchStatus.SCHEDULED,
          homeTeamId: teams[i].id,
          awayTeamId: teams[j].id,
          matchDate: new Date(Date.now() + matchDateOffset * 24 * 60 * 60 * 1000),
        });
        matchDateOffset++;
      }
    }
  }

  // Créer tous les matchs
  await prisma.match.createMany({
    data: allMatches,
  });

  return {
    matchesCreated: allMatches.length,
    groups: tournament.groups.length,
  };
}
