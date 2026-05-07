import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserFromReq } from '@/lib/clerk';
import prisma from '@/lib/prisma';
import { recalculateStandings } from '@/lib/utils/standings';
import { progressKnockoutStage, checkTournamentComplete } from '@/lib/utils/bracket-progression';
import { MatchStatus } from '@/prisma/prisma-client/enums';
import {
  triggerMatchFinishedWebhooks,
  triggerScoreUpdatedWebhooks,
  triggerStandingsUpdatedWebhooks,
  triggerBracketUpdatedWebhooks,
} from '@/lib/webhooks';
import { settleMatchBets, matchOutcomeFromScores } from '@/lib/utils/betting';

interface PlayerStat {
  playerId: string;
  goals?: number;
  assists?: number;
  yellowCards?: number;
  redCards?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vérifier l'authentification
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Vérifier que l'utilisateur est admin
    const dbUser = await syncClerkUserFromReq(req);
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Permissions insuffisantes - Admin requis' });
    }

    const matchId = req.query.id as string;
    const { homeScore, awayScore, playerStats } = req.body;

    if (!matchId) {
      return res.status(400).json({ error: 'Match ID requis' });
    }

    if (typeof homeScore !== 'number' || typeof awayScore !== 'number') {
      return res.status(400).json({ error: 'Scores invalides' });
    }

    // Récupérer le match avec les équipes pour les webhooks
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: true,
        homeTeam: true,
        awayTeam: true,
      },
    });

    if (!match) {
      return res.status(404).json({ error: 'Match introuvable' });
    }

    // Vérifier si une équipe est disqualifiée
    if (match.homeTeam.disqualified || match.awayTeam.disqualified) {
      const disqualifiedTeam = match.homeTeam.disqualified ? match.homeTeam.name : match.awayTeam.name;
      return res.status(400).json({
        error: `Impossible de soumettre le résultat : ${disqualifiedTeam} est disqualifiée. Attendez le résultat des matchs de barrage.`,
      });
    }

    // Déterminer le vainqueur
    let winnerId: string | null = null;
    if (homeScore > awayScore) {
      winnerId = match.homeTeamId;
    } else if (awayScore > homeScore) {
      winnerId = match.awayTeamId;
    }

    // Transaction pour mettre à jour le match et les stats
    const updatedMatch = await prisma.$transaction(async (tx) => {
      // Mettre à jour le match
      const updated = await tx.match.update({
        where: { id: matchId },
        data: {
          homeScore,
          awayScore,
          status: MatchStatus.FINISHED,
          winnerTeamId: winnerId,
        },
      });

      // Supprimer les anciennes stats (si re-soumission)
      await tx.matchPlayerStats.deleteMany({
        where: { matchId },
      });

      // Créer les nouvelles stats si fournies
      if (playerStats && Array.isArray(playerStats) && playerStats.length > 0) {
        // Filtrer les doublons (même joueur sélectionné plusieurs fois)
        // Garder seulement la première occurrence de chaque joueur
        const uniquePlayerStats = playerStats.reduce((acc: PlayerStat[], stat: PlayerStat) => {
          const exists = acc.find((s) => s.playerId === stat.playerId);
          if (!exists) {
            acc.push(stat);
          }
          return acc;
        }, []);

        await tx.matchPlayerStats.createMany({
          data: uniquePlayerStats.map((stat: PlayerStat) => ({
            matchId,
            playerId: stat.playerId,
            goals: stat.goals || 0,
            assists: stat.assists || 0,
            yellowCards: stat.yellowCards || 0,
            redCards: stat.redCards || 0,
          })),
        });
      }

      return updated;
    });

    // Déclencher les webhooks pour la mise à jour du score
    triggerScoreUpdatedWebhooks({
      id: updatedMatch.id,
      tournamentId: updatedMatch.tournamentId,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeTeam: { name: match.homeTeam.name },
      awayTeam: { name: match.awayTeam.name },
      homeScore,
      awayScore,
    }).catch((err) => console.error('Webhook error:', err));

    // Déclencher les webhooks pour la fin du match
    triggerMatchFinishedWebhooks({
      id: updatedMatch.id,
      tournamentId: updatedMatch.tournamentId,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeTeam: { name: match.homeTeam.name },
      awayTeam: { name: match.awayTeam.name },
      homeScore,
      awayScore,
      winnerTeamId: winnerId,
      stage: match.stage,
    }).catch((err) => console.error('Webhook error:', err));

    // Si c'est un match de poule, recalculer les standings
    if (match.stage === 'GROUP') {
      await recalculateStandings(match.tournamentId);

      // Récupérer les standings mis à jour pour les webhooks
      const standings = await prisma.standing.findMany({
        where: { tournamentId: match.tournamentId },
        include: { team: true },
        orderBy: [{ points: 'desc' }, { goalsFor: 'desc' }],
      });

      // Déclencher les webhooks pour la mise à jour du classement
      triggerStandingsUpdatedWebhooks(
        match.tournamentId,
        match.groupId,
        standings.map((s) => ({
          position: s.position,
          teamId: s.teamId,
          teamName: s.team.name,
          played: s.played,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
          points: s.points,
        }))
      ).catch((err) => console.error('Webhook error:', err));
    }

    // Settle des paris Wizebot — exécuté après l'écriture du résultat.
    // En mode "fire and forget" pour ne pas bloquer la réponse, mais on log
    // les erreurs côté serveur. En cas d'échec de crédit Wizebot, les bets
    // passent en CREDIT_FAILED et peuvent être rejoués via /api/admin/bets/retry-failed.
    let bettingSettlement: Awaited<ReturnType<typeof settleMatchBets>> | null = null;
    try {
      const matchOutcome = matchOutcomeFromScores(homeScore, awayScore);
      bettingSettlement = await settleMatchBets({
        matchId,
        outcome: matchOutcome,
      });
    } catch (err) {
      console.error('[submit-result] Erreur settlement paris:', err);
      // On ne bloque PAS la réponse: le résultat du match est déjà enregistré.
    }

    // Si c'est un match knockout, vérifier la progression du bracket
    let progressionResult = null;
    let tournamentResult = null;

    if (match.stage !== 'GROUP') {
      try {
        // Tenter de faire progresser le bracket
        progressionResult = await progressKnockoutStage(match.tournamentId, match.stage);

        // Déclencher les webhooks pour la mise à jour du bracket
        if (progressionResult?.progressed && progressionResult.message) {
          triggerBracketUpdatedWebhooks(
            match.tournamentId,
            match.stage,
            progressionResult.message
          ).catch((err) => console.error('Webhook error:', err));
        }

        // Si c'est la finale, vérifier si le tournoi est terminé
        if (match.stage === 'FINAL') {
          tournamentResult = await checkTournamentComplete(match.tournamentId);

          // Déclencher un webhook spécial pour la fin du tournoi
          if (tournamentResult?.complete && tournamentResult.winnerTeam) {
            triggerBracketUpdatedWebhooks(
              match.tournamentId,
              'TOURNAMENT_COMPLETE',
              `Tournoi terminé ! Vainqueur : ${tournamentResult.winnerTeam.name}`
            ).catch((err) => console.error('Webhook error:', err));
          }
        }
      } catch (error) {
        console.error('Error progressing bracket:', error);
        // Ne pas bloquer la réponse si la progression échoue
      }
    }

    return res.status(200).json({
      success: true,
      data: updatedMatch,
      progression: progressionResult,
      tournament: tournamentResult,
      betting: bettingSettlement,
    });
  } catch (error: unknown) {
    console.error('Error submitting match result:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur serveur',
    });
  }
}
