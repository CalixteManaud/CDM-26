import { MatchStage } from "@/prisma/prisma-client/enums";
import prisma from "../prisma";

/**
 * Détermine le stage suivant dans la progression du bracket
 */
function getNextStage(currentStage: MatchStage): MatchStage | null {
  const progression: Record<MatchStage, MatchStage | null> = {
    GROUP: null,
    PLAYOFF: 'PLAYOFF', // PLAYOFF semi-finals → PLAYOFF final
    ROUND_OF_16: 'QUARTER_FINAL',
    QUARTER_FINAL: 'SEMI_FINAL',
    SEMI_FINAL: 'FINAL',
    FINAL: null,
  };

  return progression[currentStage];
}

/**
 * Vérifie si tous les matchs d'un stage sont terminés et fait progresser le bracket
 * Appelé automatiquement après la soumission d'un résultat de match knockout
 */
export async function progressKnockoutStage(tournamentId: string, completedMatchStage: MatchStage) {
  // Ne rien faire pour les matchs de groupe
  if (completedMatchStage === 'GROUP') {
    return { progressed: false };
  }

  // Cas spécial : Gestion des matchs de barrage (PLAYOFF)
  if (completedMatchStage === 'PLAYOFF') {
    const playoffMatches = await prisma.match.findMany({
      where: {
        tournamentId,
        stage: 'PLAYOFF',
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const finishedMatches = playoffMatches.filter((m) => m.status === 'FINISHED');

    // Si on a 2 matchs terminés (les 2 demi-finales) → Créer la finale
    if (finishedMatches.length === 2 && playoffMatches.length === 2) {
      const [semi1, semi2] = finishedMatches;

      if (!semi1.winnerTeamId || !semi2.winnerTeamId) {
        throw new Error('Les demi-finales de barrage doivent avoir un vainqueur');
      }

      // Créer la finale de barrage
      await prisma.match.create({
        data: {
          tournamentId,
          stage: 'PLAYOFF',
          status: 'SCHEDULED',
          matchDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          homeTeamId: semi1.winnerTeamId,
          awayTeamId: semi2.winnerTeamId,
        },
      });

      return {
        progressed: true,
        message: 'Finale de barrage créée automatiquement',
      };
    }

    // Si on a 3 matchs dont le dernier est terminé (la finale) → Remplacer l'équipe disqualifiée
    if (finishedMatches.length === 3 && playoffMatches.length === 3) {
      const playoffFinal = finishedMatches[2]; // Le dernier match créé = la finale

      if (!playoffFinal.winnerTeamId) {
        throw new Error('La finale de barrage doit avoir un vainqueur');
      }

      const { handlePlayoffFinalComplete } = await import('./team-replacement');
      const replacementResult = await handlePlayoffFinalComplete(
        tournamentId,
        playoffFinal.winnerTeamId
      );

      if (replacementResult.replaced) {
        return {
          progressed: true,
          message: replacementResult.message,
        };
      }
    }

    return { progressed: false };
  }

  // Ne rien faire pour la finale normale
  if (completedMatchStage === 'FINAL') {
    return { progressed: false };
  }

  // Récupérer tous les matchs du même stage
  const stageMatches = await prisma.match.findMany({
    where: {
      tournamentId,
      stage: completedMatchStage,
    },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });

  // Vérifier si tous les matchs sont terminés
  const allFinished = stageMatches.every((m) => m.status === 'FINISHED');

  if (!allFinished) {
    return { progressed: false };
  }

  // Vérifier que tous les matchs ont un gagnant
  const allHaveWinner = stageMatches.every((m) => m.winnerTeamId !== null);

  if (!allHaveWinner) {
    throw new Error(
      `Tous les matchs de ${completedMatchStage} doivent avoir un vainqueur pour progresser`
    );
  }

  const nextStage = getNextStage(completedMatchStage);

  if (!nextStage) {
    return { progressed: false };
  }

  // Vérifier qu'il n'y a pas déjà de matchs pour le stage suivant
  const existingNextStageMatches = await prisma.match.count({
    where: {
      tournamentId,
      stage: nextStage,
    },
  });

  if (existingNextStageMatches > 0) {
    return {
      progressed: false,
      message: `Les matchs de ${nextStage} existent déjà`,
    };
  }

  // Récupérer les gagnants
  const winners = stageMatches
    .map((m) => m.winnerTeamId)
    .filter((id): id is string => id !== null);

  // Créer les pairings pour le tour suivant
  // On garde l'ordre des matchs : gagnant du match 1 vs gagnant du match 2, etc.
  const pairings: [string, string][] = [];
  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      pairings.push([winners[i], winners[i + 1]]);
    }
  }

  // Créer les matchs du tour suivant
  const newMatches = pairings.map((pairing, index) => ({
    tournamentId,
    stage: nextStage,
    status: 'SCHEDULED' as const,
    matchDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000), // Espacer d'un jour
    homeTeamId: pairing[0],
    awayTeamId: pairing[1],
  }));

  await prisma.match.createMany({
    data: newMatches,
  });

  return {
    progressed: true,
    nextStage,
    matchesCreated: newMatches.length,
    message: `${newMatches.length} matchs de ${nextStage} générés automatiquement`,
  };
}

/**
 * Vérifie si un tournoi est terminé (finale jouée)
 */
export async function checkTournamentComplete(tournamentId: string) {
  const finalMatch = await prisma.match.findFirst({
    where: {
      tournamentId,
      stage: 'FINAL',
      status: 'FINISHED',
    },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });

  if (finalMatch && finalMatch.winnerTeamId) {
    return {
      complete: true,
      winnerId: finalMatch.winnerTeamId,
      winnerTeam: finalMatch.homeTeam.id === finalMatch.winnerTeamId
        ? finalMatch.homeTeam
        : finalMatch.awayTeam,
    };
  }

  return { complete: false };
}
