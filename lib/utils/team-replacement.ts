import prisma from '../prisma';
import { MatchStage } from '@/prisma/prisma-client/enums';

interface PlayoffInfo {
  playoffMatchesCreated: number;
  affectedKnockoutMatches: Array<{
    matchId: string;
    stage: MatchStage;
    opponentTeamId: string;
  }>;
  bestThirds: Array<{
    teamId: string;
    groupName: string;
  }>;
}

/**
 * Génère des matchs de barrage pour remplacer une équipe disqualifiée
 * qui est déjà dans un match de knockout (quarts, demis, finale)
 */
export async function generatePlayoffForReplacement(
  tournamentId: string,
  disqualifiedTeamId: string
): Promise<PlayoffInfo> {
  // 1. Trouver les matchs knockout où l'équipe disqualifiée est présente
  const affectedMatches = await prisma.match.findMany({
    where: {
      tournamentId,
      stage: { in: ['QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'] },
      status: 'SCHEDULED',
      OR: [
        { homeTeamId: disqualifiedTeamId },
        { awayTeamId: disqualifiedTeamId },
      ],
    },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });

  if (affectedMatches.length === 0) {
    throw new Error('Aucun match de knockout trouvé pour l\'équipe disqualifiée');
  }

  // 2. Récupérer les 4 meilleurs 3èmes
  const { getBestThirds } = await import('./bracket-generator');
  const bestThirds = await getBestThirds(tournamentId);

  if (bestThirds.length < 4) {
    throw new Error(
      `Pas assez de 3èmes pour organiser les barrages. Trouvé: ${bestThirds.length}, requis: 4`
    );
  }

  const [first, second, third, fourth] = bestThirds;

  // 3. Créer les matchs de barrage (2 demi-finales)
  const playoffMatches = [
    // Demi-finale 1: Meilleur 3ème vs 4ème meilleur 3ème
    {
      tournamentId,
      stage: 'PLAYOFF' as MatchStage,
      status: 'SCHEDULED' as const,
      matchDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      homeTeamId: first.teamId,
      awayTeamId: fourth.teamId,
    },
    // Demi-finale 2: 2ème meilleur 3ème vs 3ème meilleur 3ème
    {
      tournamentId,
      stage: 'PLAYOFF' as MatchStage,
      status: 'SCHEDULED' as const,
      matchDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      homeTeamId: second.teamId,
      awayTeamId: third.teamId,
    },
  ];

  await prisma.match.createMany({
    data: playoffMatches,
  });

  console.log(
    `✅ Matchs de barrage créés pour remplacer l'équipe disqualifiée dans ${affectedMatches.length} match(s) de knockout`
  );

  // 4. Préparer les informations de retour
  const affectedKnockoutMatches = affectedMatches.map((match) => {
    const opponentTeamId =
      match.homeTeamId === disqualifiedTeamId ? match.awayTeamId : match.homeTeamId;

    return {
      matchId: match.id,
      stage: match.stage,
      opponentTeamId,
    };
  });

  return {
    playoffMatchesCreated: 2,
    affectedKnockoutMatches,
    bestThirds: bestThirds.slice(0, 4).map((t) => ({
      teamId: t.teamId,
      groupName: t.groupName,
    })),
  };
}

/**
 * Remplace l'équipe disqualifiée par le vainqueur des barrages dans le match de knockout
 * À appeler après que les matchs de barrage soient terminés
 */
export async function replaceTeamInKnockoutMatch(
  matchId: string,
  disqualifiedTeamId: string,
  replacementTeamId: string
): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match) {
    throw new Error('Match introuvable');
  }

  // Remplacer l'équipe disqualifiée par l'équipe de remplacement
  if (match.homeTeamId === disqualifiedTeamId) {
    await prisma.match.update({
      where: { id: matchId },
      data: { homeTeamId: replacementTeamId },
    });
  } else if (match.awayTeamId === disqualifiedTeamId) {
    await prisma.match.update({
      where: { id: matchId },
      data: { awayTeamId: replacementTeamId },
    });
  } else {
    throw new Error('L\'équipe disqualifiée n\'est pas dans ce match');
  }

  console.log(
    `✅ Équipe de remplacement ${replacementTeamId} a pris la place de l'équipe disqualifiée ${disqualifiedTeamId} dans le match ${matchId}`
  );
}

/**
 * Gère la fin de la finale de barrage et remplace automatiquement l'équipe disqualifiée
 * Appelé automatiquement après la soumission du résultat de la finale de barrage
 */
export async function handlePlayoffFinalComplete(
  tournamentId: string,
  playoffWinnerId: string
): Promise<{ replaced: boolean; message: string }> {
  // 1. Trouver l'équipe disqualifiée qui est dans un match de knockout
  const disqualifiedTeam = await prisma.team.findFirst({
    where: {
      tournamentId,
      disqualified: true,
    },
    include: {
      homeMatches: {
        where: {
          stage: { in: ['QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'] },
          status: 'SCHEDULED',
        },
      },
      awayMatches: {
        where: {
          stage: { in: ['QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'] },
          status: 'SCHEDULED',
        },
      },
    },
  });

  if (!disqualifiedTeam) {
    console.log('⚠️ Aucune équipe disqualifiée trouvée dans les matchs de knockout');
    return {
      replaced: false,
      message: 'Aucune équipe à remplacer',
    };
  }

  // 2. Trouver le match knockout où l'équipe disqualifiée est présente
  const affectedMatches = [
    ...disqualifiedTeam.homeMatches,
    ...disqualifiedTeam.awayMatches,
  ];

  if (affectedMatches.length === 0) {
    console.log('⚠️ Aucun match de knockout trouvé pour l\'équipe disqualifiée');
    return {
      replaced: false,
      message: 'Aucun match à mettre à jour',
    };
  }

  // 3. Remplacer l'équipe dans chaque match affecté
  const replacedMatches: string[] = [];
  for (const match of affectedMatches) {
    await replaceTeamInKnockoutMatch(match.id, disqualifiedTeam.id, playoffWinnerId);
    replacedMatches.push(match.id);
  }

  // 4. Récupérer les noms des équipes pour le message
  const winnerTeam = await prisma.team.findUnique({
    where: { id: playoffWinnerId },
  });

  return {
    replaced: true,
    message: `${winnerTeam?.name || 'Équipe gagnante'} a remporté les barrages et remplace ${disqualifiedTeam.name} dans les ${replacedMatches.length} match(s) de knockout`,
  };
}
