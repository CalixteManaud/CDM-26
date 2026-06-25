import { MatchStage } from "@/prisma/prisma-client/enums";
import prisma from "../prisma";

interface QualifiedTeam {
  teamId: string;
  groupPosition: number;
  groupId: string;
}

interface ThirdPlaceTeam {
  teamId: string;
  groupId: string;
  groupName: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
}

/**
 * Détermine le stage initial basé sur le nombre d'équipes
 */
function getInitialStage(teamCount: number): MatchStage {
  switch (teamCount) {
    case 4:
      return 'SEMI_FINAL';
    case 8:
      return 'QUARTER_FINAL';
    case 16:
      return 'ROUND_OF_16';
    default:
      throw new Error(
        `Nombre d'équipes non supporté: ${teamCount}. Doit être 4, 8, ou 16.`
      );
  }
}

/**
 * Génère les pairings pour le bracket en évitant les confrontations intra-groupe
 * Système CAN classique: 1A vs 2B, 1B vs 2A, 1C vs 2D, 1D vs 2C
 */
function generatePairings(teams: QualifiedTeam[]): [QualifiedTeam, QualifiedTeam][] {
  // Grouper les équipes par groupe et par position
  const groupMap = new Map<string, { first?: QualifiedTeam; second?: QualifiedTeam }>();

  teams.forEach((team) => {
    if (!groupMap.has(team.groupId)) {
      groupMap.set(team.groupId, {});
    }
    const groupData = groupMap.get(team.groupId)!;
    if (team.groupPosition === 1) {
      groupData.first = team;
    } else if (team.groupPosition === 2) {
      groupData.second = team;
    }
  });

  // Convertir en tableaux ordonnés
  const groups = Array.from(groupMap.entries());
  const pairings: [QualifiedTeam, QualifiedTeam][] = [];

  // Système CAN: apparier les groupes de manière croisée
  // Pour 4 groupes (A, B, C, D):
  // 1A vs 2B, 1B vs 2A, 1C vs 2D, 1D vs 2C
  if (groups.length === 4) {
    const [groupA, groupB, groupC, groupD] = groups;

    // 1A vs 2B
    if (groupA[1].first && groupB[1].second) {
      pairings.push([groupA[1].first, groupB[1].second]);
    }

    // 1B vs 2A
    if (groupB[1].first && groupA[1].second) {
      pairings.push([groupB[1].first, groupA[1].second]);
    }

    // 1C vs 2D
    if (groupC[1].first && groupD[1].second) {
      pairings.push([groupC[1].first, groupD[1].second]);
    }

    // 1D vs 2C
    if (groupD[1].first && groupC[1].second) {
      pairings.push([groupD[1].first, groupC[1].second]);
    }
  } else if (groups.length === 2) {
    // Pour 2 groupes (A, B): 1A vs 2B, 1B vs 2A
    const [groupA, groupB] = groups;

    if (groupA[1].first && groupB[1].second) {
      pairings.push([groupA[1].first, groupB[1].second]);
    }

    if (groupB[1].first && groupA[1].second) {
      pairings.push([groupB[1].first, groupA[1].second]);
    }
  } else {
    // Fallback pour d'autres configurations
    const firsts = teams.filter(t => t.groupPosition === 1);
    const seconds = teams.filter(t => t.groupPosition === 2);

    for (let i = 0; i < firsts.length; i++) {
      // Croiser les groupes: le 1er du groupe i affronte le 2ème du groupe suivant
      const secondIndex = (i + 1) % seconds.length;
      if (firsts[i] && seconds[secondIndex]) {
        pairings.push([firsts[i], seconds[secondIndex]]);
      }
    }
  }

  return pairings;
}

/**
 * Récupère les équipes qualifiées de chaque groupe
 * Prend les N meilleurs de chaque groupe selon les standings
 * Exclut les équipes disqualifiées (remplacées automatiquement par les suivantes)
 */
async function getQualifiedTeams(
  tournamentId: string,
  teamsPerGroup: number
): Promise<QualifiedTeam[]> {
  const groups = await prisma.group.findMany({
    where: { tournamentId },
    include: {
      teams: {
        include: {
          standings: {
            where: { tournamentId },
          },
        },
      },
    },
    orderBy: { position: 'asc' },
  });

  const qualifiedTeams: QualifiedTeam[] = [];

  for (const group of groups) {
    // Trier les équipes par position dans le classement
    // Exclure les équipes disqualifiées
    const sortedTeams = group.teams
      .filter((team) => team.standings.length > 0 && !team.disqualified)
      .sort((a, b) => a.standings[0].position - b.standings[0].position)
      .slice(0, teamsPerGroup); // Prendre les N premiers non disqualifiés

    if (sortedTeams.length < teamsPerGroup) {
      console.warn(
        `⚠️ Groupe ${group.name}: Seulement ${sortedTeams.length} équipes qualifiées (${teamsPerGroup} attendues). Des équipes ont peut-être été disqualifiées.`
      );
    }

    // Re-ranking : on assigne les positions 1..N dans l'ordre du classement,
    // même si une équipe disqualifiée a décalé les positions réelles (ex: le 3e
    // monte 2e). Sinon generatePairings, qui lit strictement les positions 1 et 2,
    // ignorerait un qualifié dont la position brute serait 3.
    sortedTeams.forEach((team, index) => {
      qualifiedTeams.push({
        teamId: team.id,
        groupPosition: index + 1,
        groupId: group.id,
      });
    });
  }

  return qualifiedTeams;
}

/**
 * Crée les matchs du bracket principal à partir d'un set d'équipes qualifiées.
 * Détermine le stage initial (4→SF, 8→QF, 16→R16) et génère les pairings croisés.
 */
async function createMainBracketMatches(
  tournamentId: string,
  qualifiedTeams: QualifiedTeam[]
) {
  if (![4, 8, 16].includes(qualifiedTeams.length)) {
    throw new Error(
      `Nombre invalide d'équipes qualifiées: ${qualifiedTeams.length}. Doit être 4, 8, ou 16.`
    );
  }

  const initialStage = getInitialStage(qualifiedTeams.length);
  const pairings = generatePairings(qualifiedTeams);

  const matches = pairings.map((pairing, index) => ({
    tournamentId,
    stage: initialStage,
    status: 'SCHEDULED' as const,
    matchDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000), // Espacer d'un jour
    homeTeamId: pairing[0].teamId,
    awayTeamId: pairing[1].teamId,
  }));

  await prisma.match.createMany({
    data: matches,
  });

  return { stage: initialStage, matchesCreated: matches.length };
}

/**
 * Récupère et classe les meilleurs 3èmes de tous les groupes
 * Classement: 1) Points 2) Différence de buts 3) Buts marqués
 */
export async function getBestThirds(tournamentId: string): Promise<ThirdPlaceTeam[]> {
  const groups = await prisma.group.findMany({
    where: { tournamentId },
    include: {
      teams: {
        where: { disqualified: false },
        include: {
          standings: {
            where: { tournamentId },
          },
        },
      },
    },
    orderBy: { position: 'asc' },
  });

  const thirdPlaceTeams: ThirdPlaceTeam[] = [];

  for (const group of groups) {
    // Trouver l'équipe 3ème de ce groupe
    const thirdTeam = group.teams.find(
      (team) => team.standings.length > 0 && team.standings[0].position === 3
    );

    if (thirdTeam && thirdTeam.standings.length > 0) {
      const standing = thirdTeam.standings[0];
      thirdPlaceTeams.push({
        teamId: thirdTeam.id,
        groupId: group.id,
        groupName: group.name,
        points: standing.points,
        goalDifference: standing.goalsFor - standing.goalsAgainst,
        goalsFor: standing.goalsFor,
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
      });
    }
  }

  // Trier les 3èmes selon les critères
  thirdPlaceTeams.sort((a, b) => {
    // 1. Par points (décroissant)
    if (b.points !== a.points) return b.points - a.points;

    // 2. Par différence de buts (décroissant)
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;

    // 3. Par buts marqués (décroissant)
    return b.goalsFor - a.goalsFor;
  });

  return thirdPlaceTeams;
}

/**
 * Génère les matchs de barrage pour les meilleurs 3èmes
 * Système: DF1 (1er vs 4ème), DF2 (2ème vs 3ème), Finale → Vainqueur prend la place
 */
async function generatePlayoffMatches(
  tournamentId: string,
  bestThirds: ThirdPlaceTeam[]
): Promise<void> {
  if (bestThirds.length < 4) {
    throw new Error(
      `Pas assez de 3èmes pour les barrages. Trouvé: ${bestThirds.length}, requis: 4`
    );
  }

  const [first, second, third, fourth] = bestThirds;

  // Créer les matchs de barrage
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
    `✅ Matchs de barrage créés: ${first.groupName} 3ème vs ${fourth.groupName} 3ème, ${second.groupName} 3ème vs ${third.groupName} 3ème`
  );
}

/**
 * Génère le bracket d'élimination directe
 * À appeler après la fin de la phase de poules
 */
export async function generateKnockoutBracket(tournamentId: string) {
  // Vérifier le tournoi
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { groups: true },
  });

  if (!tournament) {
    throw new Error('Tournoi introuvable');
  }

  if (!tournament.groupStageComplete) {
    throw new Error('La phase de poules doit être terminée avant de générer le bracket');
  }

  // Blocage dur : re-vérifie directement en base que TOUS les matchs de poule
  // sont réellement TERMINÉS AVEC SCORE, indépendamment du flag
  // `groupStageComplete` (qui pourrait être resté à true après l'ajout/la
  // réouverture d'un match). Un match FINISHED sans score (null) est ignoré par
  // recalculateStandings → le classement serait incomplet et le bracket
  // qualifierait les mauvaises équipes. On compte donc tout match qui n'est PAS
  // (FINISHED ET scores renseignés).
  const incompleteGroupMatches = await prisma.match.count({
    where: {
      tournamentId,
      stage: 'GROUP',
      OR: [
        { status: { not: 'FINISHED' } },
        { homeScore: null },
        { awayScore: null },
      ],
    },
  });
  if (incompleteGroupMatches > 0) {
    throw new Error(
      `Impossible de générer le bracket : ${incompleteGroupMatches} match(s) de poule ne sont pas terminés avec un score. Saisis le résultat de tous les matchs de poule d'abord.`
    );
  }

  // Vérifier qu'il n'y a pas déjà de matchs knockout
  const existingKnockout = await prisma.match.count({
    where: {
      tournamentId,
      stage: { not: 'GROUP' },
    },
  });

  if (existingKnockout > 0) {
    throw new Error('Le bracket d\'élimination existe déjà');
  }

  // Déterminer combien d'équipes qualifiées par groupe (généralement 2)
  const teamsPerGroupToQualify = 2;
  const qualifiedTeams = await getQualifiedTeams(tournamentId, teamsPerGroupToQualify);

  const expectedQualified = tournament.groups.length * teamsPerGroupToQualify; // Normalement 8 (4 groupes × 2)
  const missingSpots = expectedQualified - qualifiedTeams.length;

  // Cas 1: 1 équipe manquante (disqualifiée) → Matchs de barrage entre les 4 meilleurs 3èmes
  if (missingSpots === 1) {
    console.log('🚨 1 équipe disqualifiée détectée → Génération des matchs de barrage');

    const bestThirds = await getBestThirds(tournamentId);

    if (bestThirds.length < 4) {
      throw new Error(
        `Pas assez de 3èmes pour organiser les barrages. Trouvé: ${bestThirds.length}, requis: 4`
      );
    }

    await generatePlayoffMatches(tournamentId, bestThirds);

    return {
      stage: 'PLAYOFF' as MatchStage,
      matchesCreated: 2, // 2 demi-finales de barrage
      qualifiedTeams: qualifiedTeams.length,
      playoffRequired: true,
      message: 'Matchs de barrage créés. Les 4 meilleurs 3èmes s\'affronteront pour la place manquante.',
    };
  }

  // Cas 2: Pas d'équipe manquante → Génération normale du bracket
  const result = await createMainBracketMatches(tournamentId, qualifiedTeams);

  return {
    ...result,
    qualifiedTeams: qualifiedTeams.length,
    playoffRequired: false,
  };
}

/**
 * Complète le bracket APRÈS les barrages (scénario : une équipe a été disqualifiée
 * pendant les poules → 1 place manquante → barrages entre les 4 meilleurs 3es).
 *
 * À ce stade, aucun match de bracket principal n'existe encore (seuls les PLAYOFF
 * ont été créés par generateKnockoutBracket). Le vainqueur des barrages prend la
 * place manquante dans son groupe d'origine fictif et on génère le bracket complet.
 *
 * Appelé automatiquement par progressKnockoutStage à la fin de la finale des barrages.
 */
export async function completeBarrageAndGenerateBracket(
  tournamentId: string,
  barrageWinnerId: string
): Promise<{ generated: boolean; message: string; stage?: MatchStage; matchesCreated?: number }> {
  // Garde : si un bracket principal existe déjà, ne rien faire (idempotence)
  const existingMain = await prisma.match.count({
    where: {
      tournamentId,
      stage: { notIn: ['GROUP', 'PLAYOFF'] },
    },
  });

  if (existingMain > 0) {
    return { generated: false, message: 'Le bracket principal existe déjà' };
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { groups: true },
  });

  if (!tournament) {
    throw new Error('Tournoi introuvable');
  }

  const teamsPerGroupToQualify = 2;
  const qualifiedTeams = await getQualifiedTeams(tournamentId, teamsPerGroupToQualify);

  // Trouver le groupe incomplet et la position manquante (1 ou 2)
  const byGroup = new Map<string, QualifiedTeam[]>();
  for (const qt of qualifiedTeams) {
    if (!byGroup.has(qt.groupId)) byGroup.set(qt.groupId, []);
    byGroup.get(qt.groupId)!.push(qt);
  }

  let missingGroupId: string | null = null;
  let missingPosition = teamsPerGroupToQualify;

  for (const group of tournament.groups) {
    const got = byGroup.get(group.id) ?? [];
    if (got.length < teamsPerGroupToQualify) {
      missingGroupId = group.id;
      const taken = new Set(got.map((g) => g.groupPosition));
      for (let p = 1; p <= teamsPerGroupToQualify; p++) {
        if (!taken.has(p)) {
          missingPosition = p;
          break;
        }
      }
      break;
    }
  }

  if (!missingGroupId) {
    return { generated: false, message: 'Aucune place manquante à combler après les barrages' };
  }

  // Le vainqueur des barrages occupe la place manquante (groupe fictif pour le pairing croisé)
  qualifiedTeams.push({
    teamId: barrageWinnerId,
    groupPosition: missingPosition,
    groupId: missingGroupId,
  });

  const result = await createMainBracketMatches(tournamentId, qualifiedTeams);

  return {
    generated: true,
    message: `Vainqueur des barrages qualifié. ${result.matchesCreated} matchs de ${result.stage} générés automatiquement.`,
    ...result,
  };
}

