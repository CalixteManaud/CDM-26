import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import prisma from '@/lib/prisma';

/**
 * POST /api/tournaments/[id]/update-team-count
 *
 * Body: { groupCount: number, teamsPerGroup: number }
 *
 * Ajuste le nombre d'équipes que le tournoi peut accueillir
 * (= groupCount × teamsPerGroup). Réservé aux admins et autorisé UNIQUEMENT
 * tant qu'aucun match n'a été généré (changer la structure des groupes après
 * coup casserait le calendrier / les classements).
 *
 * Garde-fous :
 *  - Tournoi non archivé, aucun match existant.
 *  - On ne peut pas réduire `teamsPerGroup` sous l'occupation du groupe le plus
 *    rempli, ni supprimer un groupe qui contient déjà des équipes.
 */
const MIN_GROUP_COUNT = 1;
const MAX_GROUP_COUNT = 8;
const MIN_TEAMS_PER_GROUP = 2;
const MAX_TEAMS_PER_GROUP = 8;
const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const dbUser = await syncClerkUserById(userId);
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Permissions insuffisantes - Admin requis' });
    }

    const tournamentId = req.query.id as string;
    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID requis' });
    }

    const body = req.body as { groupCount?: unknown; teamsPerGroup?: unknown };
    const groupCount = Number(body.groupCount);
    const teamsPerGroup = Number(body.teamsPerGroup);

    if (
      !Number.isInteger(groupCount) ||
      groupCount < MIN_GROUP_COUNT ||
      groupCount > MAX_GROUP_COUNT
    ) {
      return res.status(400).json({
        error: `Le nombre de groupes doit être un entier entre ${MIN_GROUP_COUNT} et ${MAX_GROUP_COUNT}.`,
      });
    }
    if (
      !Number.isInteger(teamsPerGroup) ||
      teamsPerGroup < MIN_TEAMS_PER_GROUP ||
      teamsPerGroup > MAX_TEAMS_PER_GROUP
    ) {
      return res.status(400).json({
        error: `Le nombre d'équipes par groupe doit être un entier entre ${MIN_TEAMS_PER_GROUP} et ${MAX_TEAMS_PER_GROUP}.`,
      });
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        archivedAt: true,
        _count: { select: { teams: true } },
        groups: {
          select: {
            id: true,
            position: true,
            _count: { select: { teams: true } },
          },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!tournament) {
      return res.status(404).json({ error: 'Tournoi introuvable' });
    }
    if (tournament.archivedAt) {
      return res.status(400).json({ error: 'Tournoi archivé — désarchive-le d\'abord.' });
    }

    // Changer la structure des groupes après génération du calendrier serait
    // incohérent : on bloque dès qu'un match existe.
    const matchCount = await prisma.match.count({ where: { tournamentId } });
    if (matchCount > 0) {
      return res.status(400).json({
        error: 'Des matchs ont déjà été générés — réinitialise-les avant de changer le nombre d\'équipes.',
      });
    }

    // La capacité totale ne peut pas descendre sous le nombre d'équipes déjà
    // inscrites (qu'elles soient réparties dans les groupes ou non).
    const registeredTeams = tournament._count.teams;
    const capacity = groupCount * teamsPerGroup;
    if (capacity < registeredTeams) {
      return res.status(400).json({
        error: `Impossible : ${registeredTeams} équipe${registeredTeams > 1 ? 's sont' : ' est'} déjà inscrite${registeredTeams > 1 ? 's' : ''}, la capacité (${capacity}) ne peut pas être inférieure.`,
      });
    }

    // On ne peut pas réduire la taille d'un groupe sous son occupation actuelle.
    const largestGroupOccupancy = tournament.groups.reduce(
      (max, g) => Math.max(max, g._count.teams),
      0
    );
    if (teamsPerGroup < largestGroupOccupancy) {
      return res.status(400).json({
        error: `Impossible : un groupe contient déjà ${largestGroupOccupancy} équipe${largestGroupOccupancy > 1 ? 's' : ''}.`,
      });
    }

    const currentCount = tournament.groups.length;
    const groupsToRemove = tournament.groups.filter((g) => g.position > groupCount);
    const occupiedRemoved = groupsToRemove.filter((g) => g._count.teams > 0);
    if (occupiedRemoved.length > 0) {
      return res.status(400).json({
        error: 'Un des groupes à supprimer contient des équipes. Retire-les d\'abord (ou refais le tirage).',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { groupCount, teamsPerGroup },
      });

      if (groupCount < currentCount) {
        await tx.group.deleteMany({
          where: { id: { in: groupsToRemove.map((g) => g.id) } },
        });
      } else if (groupCount > currentCount) {
        await tx.group.createMany({
          data: Array.from({ length: groupCount - currentCount }).map((_, i) => {
            const position = currentCount + i + 1;
            return {
              name: `Groupe ${GROUP_NAMES[position - 1] ?? position}`,
              position,
              tournamentId,
            };
          }),
        });
      }
    });

    return res.status(200).json({
      success: true,
      data: { groupCount, teamsPerGroup, capacity: groupCount * teamsPerGroup },
    });
  } catch (error) {
    console.error('Error updating team count:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur serveur',
    });
  }
}
