'use server';

import prisma from '@/lib/prisma';
import { MatchEventType, MatchStatus } from '@/prisma/prisma-client/enums';

const TEAM_SELECT = {
  id: true,
  name: true,
  shortName: true,
  logo: true,
} as const;

const PLAYER_SELECT = {
  id: true,
  jerseyNumber: true,
  position: true,
  user: { select: { name: true, username: true, avatar: true } },
} as const;

const EVENT_SELECT = {
  id: true,
  type: true,
  minute: true,
  description: true,
  createdAt: true,
  createdById: true,
  team: { select: TEAM_SELECT },
  player: { select: PLAYER_SELECT },
} as const;

/**
 * Tous les events d'un match, du plus ancien au plus récent.
 * Utilisé en SSR pour render initial du feed.
 */
export async function getMatchEvents(matchId: string) {
  try {
    const events = await prisma.matchEvent.findMany({
      where: { matchId },
      orderBy: { createdAt: 'asc' },
      select: EVENT_SELECT,
    });
    return { success: true, data: events };
  } catch (error) {
    console.error('Error fetching match events:', error);
    return { success: false, error: 'Erreur lors de la récupération des événements' };
  }
}

/**
 * Events publiés après une date donnée. Utilisé par le polling viewer
 * (fetch /api/matches/[id]/events?since=<iso>) pour ne récupérer que
 * les nouveaux events depuis le dernier check.
 */
export async function getMatchEventsSince(matchId: string, sinceISO: string) {
  try {
    const since = new Date(sinceISO);
    if (Number.isNaN(since.getTime())) {
      return { success: false, error: 'Date `since` invalide' };
    }
    const events = await prisma.matchEvent.findMany({
      where: { matchId, createdAt: { gt: since } },
      orderBy: { createdAt: 'asc' },
      select: EVENT_SELECT,
    });
    return { success: true, data: events };
  } catch (error) {
    console.error('Error fetching events since:', error);
    return { success: false, error: 'Erreur lors de la récupération des nouveaux événements' };
  }
}

type CreateEventInput = {
  matchId: string;
  type: MatchEventType;
  minute?: number | null;
  teamId?: string | null;
  playerId?: string | null;
  description?: string | null;
  createdById?: string | null;
};

export async function createMatchEvent(input: CreateEventInput) {
  try {
    // Sécurité : si un playerId est fourni, on déduit l'équipe automatiquement
    // pour éviter une incohérence team/player.
    let teamId = input.teamId ?? null;
    if (input.playerId && !teamId) {
      const player = await prisma.player.findUnique({
        where: { id: input.playerId },
        select: { teamId: true },
      });
      if (player) teamId = player.teamId;
    }

    const event = await prisma.matchEvent.create({
      data: {
        matchId: input.matchId,
        type: input.type,
        minute: input.minute ?? null,
        teamId,
        playerId: input.playerId ?? null,
        description: input.description ?? null,
        createdById: input.createdById ?? null,
      },
      select: EVENT_SELECT,
    });
    return { success: true, data: event };
  } catch (error) {
    console.error('Error creating match event:', error);
    return { success: false, error: "Erreur lors de la création de l'événement" };
  }
}

export async function deleteMatchEvent(eventId: string) {
  try {
    await prisma.matchEvent.delete({ where: { id: eventId } });
    return { success: true };
  } catch (error) {
    console.error('Error deleting match event:', error);
    return { success: false, error: "Erreur lors de la suppression de l'événement" };
  }
}

/**
 * Change le status d'un match en respectant la machine d'états :
 *   SCHEDULED ↔ LIVE ↔ FINISHED
 *               ↘ CANCELED (depuis n'importe où)
 *
 * Side-effects automatiques :
 *  - SCHEDULED → LIVE   : crée un event MATCH_STARTED
 *  - LIVE → FINISHED    : crée un event MATCH_ENDED (sauf si déjà présent)
 *  - * → CANCELED       : event COMMENT "Match annulé"
 */
export async function updateMatchStatus(input: {
  matchId: string;
  newStatus: MatchStatus;
  createdById?: string | null;
  reason?: string | null;
}) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: input.matchId },
      select: { id: true, status: true },
    });
    if (!match) return { success: false, error: 'Match introuvable' };

    if (match.status === input.newStatus) {
      return { success: true, data: { match, eventCreated: false } };
    }

    const valid = isValidTransition(match.status as MatchStatus, input.newStatus);
    if (!valid) {
      return {
        success: false,
        error: `Transition ${match.status} → ${input.newStatus} non autorisée`,
      };
    }

    const updated = await prisma.match.update({
      where: { id: input.matchId },
      data: { status: input.newStatus },
    });

    // Auto-event sur les transitions clé
    let eventCreated = false;
    if (
      match.status === MatchStatus.SCHEDULED &&
      input.newStatus === MatchStatus.LIVE
    ) {
      await prisma.matchEvent.create({
        data: {
          matchId: input.matchId,
          type: MatchEventType.MATCH_STARTED,
          createdById: input.createdById ?? null,
        },
      });
      eventCreated = true;
    } else if (input.newStatus === MatchStatus.FINISHED) {
      // On ne duplique pas un MATCH_ENDED s'il existe déjà
      const existing = await prisma.matchEvent.findFirst({
        where: { matchId: input.matchId, type: MatchEventType.MATCH_ENDED },
        select: { id: true },
      });
      if (!existing) {
        await prisma.matchEvent.create({
          data: {
            matchId: input.matchId,
            type: MatchEventType.MATCH_ENDED,
            createdById: input.createdById ?? null,
          },
        });
        eventCreated = true;
      }
    } else if (input.newStatus === MatchStatus.CANCELED) {
      await prisma.matchEvent.create({
        data: {
          matchId: input.matchId,
          type: MatchEventType.COMMENT,
          description: input.reason ?? 'Match annulé',
          createdById: input.createdById ?? null,
        },
      });
      eventCreated = true;
    }

    return { success: true, data: { match: updated, eventCreated } };
  } catch (error) {
    console.error('Error updating match status:', error);
    return { success: false, error: 'Erreur lors du changement de statut' };
  }
}

function isValidTransition(from: MatchStatus, to: MatchStatus): boolean {
  if (from === to) return true;
  // CANCELED accessible depuis tout état
  if (to === MatchStatus.CANCELED) return true;
  // Une fois CANCELED, on peut ré-ouvrir vers SCHEDULED (cas d'erreur de saisie)
  if (from === MatchStatus.CANCELED && to === MatchStatus.SCHEDULED) return true;
  // Reset accidentel : FINISHED → LIVE (admin corrige une erreur)
  if (from === MatchStatus.FINISHED && to === MatchStatus.LIVE) return true;
  // Autorise aussi LIVE → SCHEDULED (annulation kick-off prématurée)
  if (from === MatchStatus.LIVE && to === MatchStatus.SCHEDULED) return true;
  // Cas linéaires
  if (from === MatchStatus.SCHEDULED && to === MatchStatus.LIVE) return true;
  if (from === MatchStatus.LIVE && to === MatchStatus.FINISHED) return true;
  if (from === MatchStatus.SCHEDULED && to === MatchStatus.FINISHED) return true; // direct au cas où
  return false;
}
