import prisma from '../prisma';

interface StandingsData {
  teamId: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

/**
 * Recalcule les classements pour un tournoi
 * Doit être appelé après chaque résultat de match de poule
 * Les positions sont calculées PAR GROUPE (1-4 dans chaque groupe)
 */
export async function recalculateStandings(tournamentId: string) {
  // Récupérer tous les matchs de poule complétés
  const matches = await prisma.match.findMany({
    where: {
      tournamentId,
      stage: 'GROUP',
      status: 'FINISHED',
    },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });

  // Récupérer toutes les équipes du tournoi avec leur groupe
  const teams = await prisma.team.findMany({
    where: { tournamentId },
    select: { id: true, groupId: true },
  });

  // Initialiser les stats pour chaque équipe
  const standingsMap = new Map<string, StandingsData>();

  teams.forEach((team) => {
    standingsMap.set(team.id, {
      teamId: team.id,
      position: 0, // Sera calculé par groupe plus tard
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    });
  });

  // Calculer les stats à partir des matchs
  matches.forEach((match) => {
    const { homeTeamId, awayTeamId, homeScore, awayScore } = match;

    if (homeScore === null || awayScore === null) return;

    const homeStats = standingsMap.get(homeTeamId)!;
    const awayStats = standingsMap.get(awayTeamId)!;

    // Incrémenter les matchs joués
    homeStats.played++;
    awayStats.played++;

    // Incrémenter les buts
    homeStats.goalsFor += homeScore;
    homeStats.goalsAgainst += awayScore;
    awayStats.goalsFor += awayScore;
    awayStats.goalsAgainst += homeScore;

    // Déterminer le résultat et les points
    if (homeScore > awayScore) {
      // Victoire domicile
      homeStats.won++;
      homeStats.points += 3;
      awayStats.lost++;
    } else if (homeScore < awayScore) {
      // Victoire extérieur
      awayStats.won++;
      awayStats.points += 3;
      homeStats.lost++;
    } else {
      // Match nul
      homeStats.drawn++;
      awayStats.drawn++;
      homeStats.points += 1;
      awayStats.points += 1;
    }
  });

  // Fonction de tri pour les standings (par points, puis diff de buts, puis buts marqués)
  const sortStandings = (a: StandingsData, b: StandingsData) => {
    // 1. Par points (décroissant)
    if (b.points !== a.points) return b.points - a.points;

    // 2. Par différence de buts (décroissant)
    const diffA = a.goalsFor - a.goalsAgainst;
    const diffB = b.goalsFor - b.goalsAgainst;
    if (diffB !== diffA) return diffB - diffA;

    // 3. Par buts marqués (décroissant)
    return b.goalsFor - a.goalsFor;
  };

  // Grouper les équipes par groupe
  const teamsByGroup = new Map<string, typeof teams>();
  teams.forEach((team) => {
    if (!team.groupId) return;
    if (!teamsByGroup.has(team.groupId)) {
      teamsByGroup.set(team.groupId, []);
    }
    teamsByGroup.get(team.groupId)!.push(team);
  });

  // Calculer les positions PAR GROUPE
  const allStandings: StandingsData[] = [];

  teamsByGroup.forEach((groupTeams, groupId) => {
    // Récupérer les standings de ce groupe uniquement
    const groupStandings = groupTeams
      .map((team) => standingsMap.get(team.id)!)
      .filter(Boolean)
      .sort(sortStandings);

    // Attribuer les positions 1, 2, 3, 4 dans ce groupe
    groupStandings.forEach((standing, index) => {
      standing.position = index + 1;
      allStandings.push(standing);
    });
  });

  // Mettre à jour la base de données avec une transaction
  await prisma.$transaction(
    allStandings.map((standing) =>
      prisma.standing.upsert({
        where: {
          tournamentId_teamId: {
            tournamentId,
            teamId: standing.teamId,
          },
        },
        create: {
          tournamentId,
          teamId: standing.teamId,
          position: standing.position,
          played: standing.played,
          won: standing.won,
          drawn: standing.drawn,
          lost: standing.lost,
          goalsFor: standing.goalsFor,
          goalsAgainst: standing.goalsAgainst,
          points: standing.points,
        },
        update: {
          position: standing.position,
          played: standing.played,
          won: standing.won,
          drawn: standing.drawn,
          lost: standing.lost,
          goalsFor: standing.goalsFor,
          goalsAgainst: standing.goalsAgainst,
          points: standing.points,
        },
      })
    )
  );

  return allStandings;
}

/**
 * Récupère le classement d'un groupe spécifique
 */
export async function getGroupStandings(tournamentId: string, groupId: string) {
  const standings = await prisma.standing.findMany({
    where: {
      tournamentId,
      team: {
        groupId,
      },
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          shortName: true,
          logo: true,
        },
      },
    },
    orderBy: {
      position: 'asc',
    },
  });

  return standings;
}

/**
 * Récupère le classement général du tournoi
 */
export async function getTournamentStandings(tournamentId: string) {
  const standings = await prisma.standing.findMany({
    where: { tournamentId },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          shortName: true,
          logo: true,
          groupId: true,
          group: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      position: 'asc',
    },
  });

  return standings;
}
