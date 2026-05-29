import prisma from '../prisma';
import { MatchStage, MatchStatus } from '@/prisma/prisma-client/enums';

export type GenerateGroupOptions = {
  /** ISO date string ou Date — point de départ du calendrier. Défaut: maintenant. */
  startDate?: string | Date;
  /** Espacement entre deux matchs successifs, en heures. Défaut: 24. */
  intervalHours?: number;
};

export type GenerateGroupResult = {
  matchesCreated: number;
  groups: number;
  /** Diagnostics utiles pour distinguer un succès partiel d'un échec silencieux. */
  diagnostics: {
    teamsTotal: number;
    teamsActive: number; // non disqualifiées + ayant un groupId
    teamsUnassigned: number; // groupId null
    teamsDisqualified: number;
    groupsTotal: number;
    groupsSkipped: number; // moins de 2 équipes actives → pas de matchs générés pour ce groupe
    skippedGroupNames: string[];
  };
};

/**
 * Génère tous les matchs de groupe pour un tournoi (round-robin par groupe).
 *
 * Règles :
 *  - Tournoi non archivé requis.
 *  - Aucun match `GROUP` ne doit déjà exister sur ce tournoi.
 *  - Équipes disqualifiées exclues du calendrier.
 *  - Équipes sans groupe (`groupId = null`) exclues.
 *  - Un groupe avec < 2 équipes actives est skip et listé dans `diagnostics`.
 */
export async function generateGroupMatches(
  tournamentId: string,
  options: GenerateGroupOptions = {}
): Promise<GenerateGroupResult> {
  const intervalHours = options.intervalHours ?? 24;
  if (!Number.isFinite(intervalHours) || intervalHours <= 0) {
    throw new Error("L'intervalle entre matchs doit être un nombre d'heures positif");
  }

  const startBase = options.startDate ? new Date(options.startDate) : new Date();
  if (Number.isNaN(startBase.getTime())) {
    throw new Error('Date de départ invalide');
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      teams: { select: { id: true, groupId: true, disqualified: true } },
      groups: {
        include: {
          teams: {
            where: { disqualified: false },
            select: { id: true },
          },
        },
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!tournament) {
    throw new Error('Tournoi introuvable');
  }

  if (tournament.archivedAt) {
    throw new Error('Ce tournoi est archivé — désarchive-le avant de générer les matchs');
  }

  const existingMatches = await prisma.match.count({
    where: { tournamentId, stage: 'GROUP' },
  });

  if (existingMatches > 0) {
    throw new Error(
      `Les matchs de groupe existent déjà (${existingMatches} matchs trouvés). Supprime-les avant de relancer.`
    );
  }

  const teamsTotal = tournament.teams.length;
  const teamsDisqualified = tournament.teams.filter((t) => t.disqualified).length;
  const teamsUnassigned = tournament.teams.filter((t) => !t.disqualified && !t.groupId).length;
  const teamsActive = tournament.teams.filter((t) => !t.disqualified && t.groupId).length;

  const allMatches: Array<{
    tournamentId: string;
    groupId: string;
    stage: MatchStage;
    status: MatchStatus;
    homeTeamId: string;
    awayTeamId: string;
    matchDate: Date;
  }> = [];

  const skippedGroupNames: string[] = [];
  let offsetSlots = 0;
  const slotMs = intervalHours * 60 * 60 * 1000;

  for (const group of tournament.groups) {
    const teams = group.teams;

    if (teams.length < 2) {
      skippedGroupNames.push(group.name);
      continue;
    }

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        allMatches.push({
          tournamentId,
          groupId: group.id,
          stage: MatchStage.GROUP,
          status: MatchStatus.SCHEDULED,
          homeTeamId: teams[i].id,
          awayTeamId: teams[j].id,
          matchDate: new Date(startBase.getTime() + offsetSlots * slotMs),
        });
        offsetSlots++;
      }
    }
  }

  if (allMatches.length === 0) {
    // Aucun match créé : on ne fait pas d'insert (pas la peine), mais on remonte
    // les diagnostics pour que l'UI puisse expliquer ce qu'il manque.
    throw new Error(
      diagnoseNoMatches({
        teamsTotal,
        teamsActive,
        teamsUnassigned,
        teamsDisqualified,
        groupsTotal: tournament.groups.length,
        skippedGroupNames,
      })
    );
  }

  await prisma.match.createMany({ data: allMatches });

  return {
    matchesCreated: allMatches.length,
    groups: tournament.groups.length - skippedGroupNames.length,
    diagnostics: {
      teamsTotal,
      teamsActive,
      teamsUnassigned,
      teamsDisqualified,
      groupsTotal: tournament.groups.length,
      groupsSkipped: skippedGroupNames.length,
      skippedGroupNames,
    },
  };
}

function diagnoseNoMatches(d: {
  teamsTotal: number;
  teamsActive: number;
  teamsUnassigned: number;
  teamsDisqualified: number;
  groupsTotal: number;
  skippedGroupNames: string[];
}): string {
  if (d.groupsTotal === 0) {
    return 'Aucun groupe configuré sur ce tournoi — crée des groupes avant de générer.';
  }
  if (d.teamsTotal === 0) {
    return 'Aucune équipe inscrite dans ce tournoi.';
  }
  if (d.teamsActive === 0) {
    const parts: string[] = [];
    if (d.teamsUnassigned > 0) parts.push(`${d.teamsUnassigned} sans groupe`);
    if (d.teamsDisqualified > 0) parts.push(`${d.teamsDisqualified} disqualifiée(s)`);
    return `Aucune équipe active à répartir (${parts.join(', ') || 'aucune équipe valide'}). Assigne d'abord les équipes à un groupe.`;
  }
  return `Aucun groupe n'a au moins 2 équipes actives. Groupes ignorés : ${d.skippedGroupNames.join(', ')}.`;
}
