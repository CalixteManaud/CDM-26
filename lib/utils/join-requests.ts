/**
 * Demandes d'adhésion à une équipe (phase d'inscription).
 *
 * Server-only (importe Prisma + permissions + notifications). Appelé depuis les
 * API routes `pages/api/join-requests/*`. Convention de retour identique aux
 * autres modules "transactionnels" du projet :
 *   { ok: true, data? } | { ok: false, code, message }
 * pour que l'API route mappe `code` → statut HTTP.
 */

import prisma from '@/lib/prisma';
import { canManageTeam, isSiteAdmin } from '@/lib/utils/permissions';
import { createNotification, createNotifications } from '@/lib/utils/notifications';
import { NotificationType } from '@/prisma/prisma-client/enums';
import { getUserDisplayName } from '@/lib/utils/display';

export type JoinRequestCode =
  | 'NOT_FOUND'
  | 'CLOSED' // inscriptions fermées (archivé ou poules tirées)
  | 'TEAM_FULL'
  | 'ALREADY_PLAYER'
  | 'ALREADY_PENDING'
  | 'ALREADY_REVIEWED'
  | 'JERSEY_TAKEN'
  | 'FORBIDDEN'
  | 'ERROR';

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; code: JoinRequestCode; message: string };

const POSITION_LABELS: Record<string, string> = {
  GK: 'Gardien',
  DEF: 'Défenseur',
  MID: 'Milieu',
  ATT: 'Attaquant',
};

/**
 * La fenêtre d'inscription est ouverte tant que le tournoi est actif et que les
 * poules ne sont pas encore générées. (La capacité de l'équipe est vérifiée à
 * part car elle dépend de l'équipe, pas du tournoi.)
 */
function isRegistrationOpen(t: { archivedAt: Date | null; groupStageComplete: boolean }): boolean {
  return t.archivedAt === null && !t.groupStageComplete;
}

/**
 * Crée une demande d'adhésion. Le participant propose numéro + poste.
 * Notifie le coach de l'équipe (s'il existe) + tous les admins du site.
 */
export async function createJoinRequest(params: {
  userId: string;
  teamId: string;
  jerseyNumber: number;
  position: string;
  message?: string | null;
}): Promise<Ok<{ id: string }> | Err> {
  const { userId, teamId, jerseyNumber, position, message } = params;

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        coachUserId: true,
        tournamentId: true,
        tournament: {
          select: { id: true, archivedAt: true, groupStageComplete: true, playersPerTeam: true },
        },
        _count: { select: { players: true } },
      },
    });

    if (!team || !team.tournament) {
      return { ok: false, code: 'NOT_FOUND', message: 'Équipe introuvable.' };
    }
    if (!isRegistrationOpen(team.tournament)) {
      return {
        ok: false,
        code: 'CLOSED',
        message: 'Les inscriptions sont fermées pour ce tournoi (poules tirées ou tournoi archivé).',
      };
    }
    if (team._count.players >= team.tournament.playersPerTeam) {
      return { ok: false, code: 'TEAM_FULL', message: 'Cette équipe est complète.' };
    }

    // Déjà joueur d'une équipe de ce tournoi ?
    const existingPlayer = await prisma.player.findFirst({
      where: { userId, team: { tournamentId: team.tournamentId } },
      select: { id: true },
    });
    if (existingPlayer) {
      return { ok: false, code: 'ALREADY_PLAYER', message: 'Tu fais déjà partie d\'une équipe de ce tournoi.' };
    }

    // Demande PENDING déjà existante sur ce tournoi ?
    const existingPending = await prisma.teamJoinRequest.findFirst({
      where: { userId, tournamentId: team.tournamentId, status: 'PENDING' },
      select: { id: true },
    });
    if (existingPending) {
      return {
        ok: false,
        code: 'ALREADY_PENDING',
        message: 'Tu as déjà une demande en attente sur ce tournoi. Retire-la avant d\'en envoyer une autre.',
      };
    }

    const request = await prisma.teamJoinRequest.create({
      data: {
        userId,
        teamId,
        tournamentId: team.tournamentId,
        desiredJersey: jerseyNumber,
        desiredPosition: position,
        message: message?.trim() ? message.trim() : null,
      },
      select: { id: true, user: { select: { username: true, name: true, email: true } } },
    });

    // Notifie coach + admins (fire-and-forget).
    const applicant = getUserDisplayName(request.user);
    const recipientIds = new Set<string>();
    if (team.coachUserId) recipientIds.add(team.coachUserId);
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    admins.forEach((a) => recipientIds.add(a.id));

    await createNotifications(
      [...recipientIds].map((rid) => ({
        userId: rid,
        type: NotificationType.JOIN_REQUEST_RECEIVED,
        title: 'Nouvelle demande d\'adhésion',
        body: `${applicant} souhaite rejoindre ${team.name} (${POSITION_LABELS[position] ?? position} #${jerseyNumber}).`,
        href: `/teams/${teamId}/demandes`,
      }))
    );

    return { ok: true, data: { id: request.id } };
  } catch (error) {
    console.error('[join-requests] createJoinRequest', error);
    return { ok: false, code: 'ERROR', message: 'Erreur lors de l\'envoi de la demande.' };
  }
}

/**
 * Accepte (→ crée le Player, numéro/poste ajustables) ou refuse une demande.
 * Réservé à l'admin ou au coach de l'équipe concernée.
 */
export async function reviewJoinRequest(params: {
  requestId: string;
  reviewerId: string;
  action: 'accept' | 'reject';
  jerseyNumber?: number;
  position?: string;
  note?: string | null;
}): Promise<Ok<{ playerId?: string }> | Err> {
  const { requestId, reviewerId, action, jerseyNumber, position, note } = params;

  try {
    const request = await prisma.teamJoinRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        userId: true,
        teamId: true,
        tournamentId: true,
        desiredJersey: true,
        desiredPosition: true,
        team: {
          select: {
            name: true,
            tournament: {
              select: { archivedAt: true, groupStageComplete: true, playersPerTeam: true },
            },
            _count: { select: { players: true } },
          },
        },
      },
    });

    if (!request || !request.team?.tournament) {
      return { ok: false, code: 'NOT_FOUND', message: 'Demande introuvable.' };
    }
    if (request.status !== 'PENDING') {
      return { ok: false, code: 'ALREADY_REVIEWED', message: 'Cette demande a déjà été traitée.' };
    }

    const canManage = await canManageTeam(reviewerId, request.teamId);
    if (!canManage) {
      return { ok: false, code: 'FORBIDDEN', message: 'Tu n\'as pas les droits sur cette équipe.' };
    }

    const cleanNote = note?.trim() ? note.trim() : null;

    // ─── REFUS ───
    if (action === 'reject') {
      await prisma.teamJoinRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED', reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: cleanNote },
      });

      await createNotification({
        userId: request.userId,
        type: NotificationType.JOIN_REQUEST_REJECTED,
        title: 'Demande refusée',
        body: `Ta demande pour rejoindre ${request.team.name} a été refusée.${cleanNote ? ` Motif : ${cleanNote}` : ''}`,
        href: `/tournaments/${request.tournamentId}/rejoindre`,
      });

      return { ok: true, data: {} };
    }

    // ─── ACCEPTATION ───
    // Re-check des conditions au moment de la décision (la fenêtre a pu changer).
    if (!isRegistrationOpen(request.team.tournament)) {
      return { ok: false, code: 'CLOSED', message: 'Les inscriptions sont fermées, impossible de valider.' };
    }
    if (request.team._count.players >= request.team.tournament.playersPerTeam) {
      return { ok: false, code: 'TEAM_FULL', message: 'L\'équipe est déjà complète.' };
    }

    // L'user est-il devenu joueur d'une autre équipe entre-temps ?
    const alreadyPlayer = await prisma.player.findFirst({
      where: { userId: request.userId, team: { tournamentId: request.tournamentId } },
      select: { id: true },
    });
    if (alreadyPlayer) {
      return { ok: false, code: 'ALREADY_PLAYER', message: 'Ce participant fait déjà partie d\'une équipe du tournoi.' };
    }

    const finalJersey = jerseyNumber ?? request.desiredJersey;
    const finalPosition = position ?? request.desiredPosition;

    let playerId: string;
    try {
      const [player] = await prisma.$transaction([
        prisma.player.create({
          data: {
            jerseyNumber: finalJersey,
            position: finalPosition,
            userId: request.userId,
            teamId: request.teamId,
          },
          select: { id: true },
        }),
        prisma.teamJoinRequest.update({
          where: { id: requestId },
          data: { status: 'ACCEPTED', reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: cleanNote },
        }),
      ]);
      playerId = player.id;
    } catch (e) {
      const err = e as { code?: string; meta?: { target?: string[] } };
      if (err.code === 'P2002' && err.meta?.target?.includes('jerseyNumber')) {
        return {
          ok: false,
          code: 'JERSEY_TAKEN',
          message: `Le numéro ${finalJersey} est déjà pris dans cette équipe. Choisis-en un autre.`,
        };
      }
      throw e;
    }

    await createNotification({
      userId: request.userId,
      type: NotificationType.JOIN_REQUEST_ACCEPTED,
      title: 'Demande acceptée 🎉',
      body: `Tu as rejoint ${request.team.name} (${POSITION_LABELS[finalPosition] ?? finalPosition} #${finalJersey}).`,
      href: `/teams/${request.teamId}`,
    });

    return { ok: true, data: { playerId } };
  } catch (error) {
    console.error('[join-requests] reviewJoinRequest', error);
    return { ok: false, code: 'ERROR', message: 'Erreur lors du traitement de la demande.' };
  }
}

/**
 * Le participant retire sa propre demande (uniquement si encore PENDING).
 */
export async function cancelJoinRequest(params: {
  requestId: string;
  userId: string;
}): Promise<Ok<Record<string, never>> | Err> {
  const { requestId, userId } = params;
  try {
    const request = await prisma.teamJoinRequest.findUnique({
      where: { id: requestId },
      select: { id: true, userId: true, status: true },
    });
    if (!request || request.userId !== userId) {
      return { ok: false, code: 'NOT_FOUND', message: 'Demande introuvable.' };
    }
    if (request.status !== 'PENDING') {
      return { ok: false, code: 'ALREADY_REVIEWED', message: 'Cette demande a déjà été traitée.' };
    }
    await prisma.teamJoinRequest.update({ where: { id: requestId }, data: { status: 'CANCELED' } });
    return { ok: true, data: {} };
  } catch (error) {
    console.error('[join-requests] cancelJoinRequest', error);
    return { ok: false, code: 'ERROR', message: 'Erreur lors du retrait de la demande.' };
  }
}

// ─────────────────────────── LECTURES (SSR) ───────────────────────────

const REVIEW_INCLUDE = {
  user: { select: { id: true, name: true, username: true, email: true, avatar: true } },
  team: { select: { id: true, name: true, shortName: true, logo: true } },
  tournament: { select: { id: true, name: true } },
} as const;

/**
 * Demandes PENDING que le reviewer peut traiter.
 *  - admin  → toutes (tournois actifs)
 *  - coach  → celles des équipes qu'il coache
 */
export async function getReviewableRequests(reviewerId: string) {
  const admin = await isSiteAdmin(reviewerId);
  return prisma.teamJoinRequest.findMany({
    where: {
      status: 'PENDING',
      tournament: { archivedAt: null },
      ...(admin ? {} : { team: { coachUserId: reviewerId } }),
    },
    include: REVIEW_INCLUDE,
    orderBy: { createdAt: 'asc' },
  });
}

/** Demandes PENDING d'une équipe précise. */
export async function getTeamPendingRequests(teamId: string) {
  return prisma.teamJoinRequest.findMany({
    where: { teamId, status: 'PENDING' },
    include: REVIEW_INCLUDE,
    orderBy: { createdAt: 'asc' },
  });
}

/** Compte les demandes PENDING d'une équipe (badge). */
export async function countTeamPendingRequests(teamId: string): Promise<number> {
  return prisma.teamJoinRequest.count({ where: { teamId, status: 'PENDING' } });
}

/** Toutes les demandes d'un participant sur un tournoi (statut courant + historique). */
export async function getUserRequestsForTournament(userId: string, tournamentId: string) {
  return prisma.teamJoinRequest.findMany({
    where: { userId, tournamentId },
    include: { team: { select: { id: true, name: true, shortName: true, logo: true } } },
    orderBy: { createdAt: 'desc' },
  });
}
