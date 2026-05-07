import prisma from "../prisma";

export interface TeamStats {
  teamId: string;
  teamName: string;
  teamShortName: string;
  teamLogo?: string | null;
  goalsScored: number;
  goalsConceded: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  playerNumber: number;
  position: string;
  teamId: string;
  teamName: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
}

export interface GoalkeeperStats {
  playerId: string;
  playerName: string;
  playerNumber: number;
  teamId: string;
  teamName: string;
  goalsConceded: number;
  matchesPlayed: number;
}

export interface TournamentStatistics {
  // Stats globales
  totalMatches: number;
  totalGoals: number;

  // Stats par équipe
  teamStats: TeamStats[];
  topScoringTeam: TeamStats | null;
  lowestScoringTeam: TeamStats | null;
  mostConceededTeam: TeamStats | null;
  mostAssistsTeam: TeamStats | null;
  mostYellowCardsTeam: TeamStats | null;
  mostRedCardsTeam: TeamStats | null;

  // Stats par joueur
  playerStats: PlayerStats[];
  topScorer: PlayerStats | null;
  topAssister: PlayerStats | null;
  mostYellowCards: PlayerStats | null;
  mostRedCards: PlayerStats | null;

  // Stats gardiens
  goalkeeperStats: GoalkeeperStats[];
  bestGoalkeeper: GoalkeeperStats | null;
  worstGoalkeeper: GoalkeeperStats | null;
}

/**
 * Calcule toutes les statistiques d'un tournoi terminé
 */
export async function getTournamentStatistics(tournamentId: string): Promise<TournamentStatistics> {
  // Récupérer tous les matchs terminés du tournoi
  const matches = await prisma.match.findMany({
    where: {
      tournamentId,
      status: 'FINISHED',
    },
    include: {
      homeTeam: {
        include: {
          players: {
            include: {
              user: true,
            },
          },
        },
      },
      awayTeam: {
        include: {
          players: {
            include: {
              user: true,
            },
          },
        },
      },
      playerStats: {
        include: {
          player: {
            include: {
              user: true,
              team: true,
            },
          },
        },
      },
    },
  });

  // Initialiser les maps pour les stats
  const teamStatsMap = new Map<string, TeamStats>();
  const playerStatsMap = new Map<string, PlayerStats>();
  const goalkeeperStatsMap = new Map<string, GoalkeeperStats>();

  let totalGoals = 0;

  // Parcourir tous les matchs (exclure ceux avec des équipes disqualifiées)
  for (const match of matches) {
    if (match.homeScore === null || match.awayScore === null) continue;

    // Ignorer les matchs impliquant des équipes disqualifiées
    if (match.homeTeam.disqualified || match.awayTeam.disqualified) {
      continue;
    }

    totalGoals += match.homeScore + match.awayScore;

    // Stats équipe domicile
    updateTeamStats(teamStatsMap, match.homeTeam, match.homeScore, match.awayScore);

    // Stats équipe extérieure
    updateTeamStats(teamStatsMap, match.awayTeam, match.awayScore, match.homeScore);

    // Stats gardiens - buts encaissés
    updateGoalkeeperStats(goalkeeperStatsMap, match.homeTeam, match.awayScore);
    updateGoalkeeperStats(goalkeeperStatsMap, match.awayTeam, match.homeScore);

    // Stats joueurs depuis MatchPlayerStats (exclure joueurs d'équipes disqualifiées)
    for (const stat of match.playerStats) {
      // Ignorer les joueurs d'équipes disqualifiées
      if (stat.player.team.disqualified) {
        continue;
      }

      if (!playerStatsMap.has(stat.playerId)) {
        playerStatsMap.set(stat.playerId, {
          playerId: stat.playerId,
          playerName: stat.player.user.name || 'Joueur',
          playerNumber: stat.player.jerseyNumber,
          position: stat.player.position,
          teamId: stat.player.teamId,
          teamName: stat.player.team.name,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          matchesPlayed: 0,
        });
      }

      const playerStat = playerStatsMap.get(stat.playerId)!;
      playerStat.goals += stat.goals;
      playerStat.assists += stat.assists;
      playerStat.yellowCards += stat.yellowCards;
      playerStat.redCards += stat.redCards;
      playerStat.matchesPlayed += 1;

      // Ajouter les stats au total de l'équipe
      const teamId = stat.player.teamId;
      if (teamStatsMap.has(teamId)) {
        const teamStat = teamStatsMap.get(teamId)!;
        teamStat.assists += stat.assists;
        teamStat.yellowCards += stat.yellowCards;
        teamStat.redCards += stat.redCards;
      }
    }
  }

  // Convertir les maps en arrays
  const teamStats = Array.from(teamStatsMap.values());
  const playerStats = Array.from(playerStatsMap.values());
  const goalkeeperStats = Array.from(goalkeeperStatsMap.values());

  // Calculer les tops
  const topScoringTeam = teamStats.reduce((max, team) =>
    !max || team.goalsScored > max.goalsScored ? team : max, null as TeamStats | null
  );

  const lowestScoringTeam = teamStats.reduce((min, team) =>
    !min || team.goalsScored < min.goalsScored ? team : min, null as TeamStats | null
  );

  const mostConceededTeam = teamStats.reduce((max, team) =>
    !max || team.goalsConceded > max.goalsConceded ? team : max, null as TeamStats | null
  );

  const mostAssistsTeam = teamStats.reduce((max, team) =>
    !max || team.assists > max.assists ? team : max, null as TeamStats | null
  );

  const mostYellowCardsTeam = teamStats.reduce((max, team) =>
    !max || team.yellowCards > max.yellowCards ? team : max, null as TeamStats | null
  );

  const mostRedCardsTeam = teamStats.reduce((max, team) =>
    !max || team.redCards > max.redCards ? team : max, null as TeamStats | null
  );

  const topScorer = playerStats.reduce((max, player) =>
    !max || player.goals > max.goals ? player : max, null as PlayerStats | null
  );

  const topAssister = playerStats.reduce((max, player) =>
    !max || player.assists > max.assists ? player : max, null as PlayerStats | null
  );

  const mostYellowCards = playerStats.reduce((max, player) =>
    !max || player.yellowCards > max.yellowCards ? player : max, null as PlayerStats | null
  );

  const mostRedCards = playerStats.reduce((max, player) =>
    !max || player.redCards > max.redCards ? player : max, null as PlayerStats | null
  );

  // Meilleur gardien = moins de buts encaissés (minimum 1 match)
  const bestGoalkeeper = goalkeeperStats
    .filter(gk => gk.matchesPlayed > 0)
    .reduce((best, gk) =>
      !best || gk.goalsConceded < best.goalsConceded ? gk : best, null as GoalkeeperStats | null
    );

  // Pire gardien = plus de buts encaissés (minimum 1 match)
  const worstGoalkeeper = goalkeeperStats
    .filter(gk => gk.matchesPlayed > 0)
    .reduce((worst, gk) =>
      !worst || gk.goalsConceded > worst.goalsConceded ? gk : worst, null as GoalkeeperStats | null
    );

  return {
    totalMatches: matches.length,
    totalGoals,
    teamStats: teamStats.sort((a, b) => b.goalsScored - a.goalsScored),
    topScoringTeam,
    lowestScoringTeam,
    mostConceededTeam,
    mostAssistsTeam,
    mostYellowCardsTeam,
    mostRedCardsTeam,
    playerStats: playerStats.sort((a, b) => b.goals - a.goals),
    topScorer,
    topAssister,
    mostYellowCards,
    mostRedCards,
    goalkeeperStats: goalkeeperStats.sort((a, b) => a.goalsConceded - b.goalsConceded),
    bestGoalkeeper,
    worstGoalkeeper,
  };
}

function updateTeamStats(
  map: Map<string, TeamStats>,
  team: any,
  goalsScored: number,
  goalsConceded: number
) {
  // Ignorer les équipes disqualifiées
  if (team.disqualified) return;

  if (!map.has(team.id)) {
    map.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      teamShortName: team.shortName,
      teamLogo: team.logo,
      goalsScored: 0,
      goalsConceded: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      matchesPlayed: 0,
    });
  }

  const stats = map.get(team.id)!;
  stats.goalsScored += goalsScored;
  stats.goalsConceded += goalsConceded;
  stats.matchesPlayed += 1;
}

function updateGoalkeeperStats(
  map: Map<string, GoalkeeperStats>,
  team: any,
  goalsConceded: number
) {
  // Ignorer les équipes disqualifiées
  if (team.disqualified) return;

  // Trouver le gardien de l'équipe (position GK)
  const goalkeeper = team.players.find((p: any) => p.position === 'GK');

  if (!goalkeeper) return;

  if (!map.has(goalkeeper.id)) {
    map.set(goalkeeper.id, {
      playerId: goalkeeper.id,
      playerName: goalkeeper.user.name || 'Gardien',
      playerNumber: goalkeeper.jerseyNumber,
      teamId: team.id,
      teamName: team.name,
      goalsConceded: 0,
      matchesPlayed: 0,
    });
  }

  const stats = map.get(goalkeeper.id)!;
  stats.goalsConceded += goalsConceded;
  stats.matchesPlayed += 1;
}
