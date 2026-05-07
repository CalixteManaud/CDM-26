import prisma from '@/lib/prisma';
import crypto from 'crypto';

export type WebhookEventType =
  | 'MATCH_STARTED'
  | 'MATCH_FINISHED'
  | 'SCORE_UPDATED'
  | 'STANDINGS_UPDATED'
  | 'BRACKET_UPDATED';

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

interface WebhookTriggerOptions {
  tournamentId?: string;
  teamId?: string;
}

/**
 * Génère une signature HMAC-SHA256 pour sécuriser le webhook
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Envoie une requête webhook à une URL
 */
async function sendWebhookRequest(
  url: string,
  payload: WebhookPayload,
  secret?: string
): Promise<boolean> {
  try {
    const payloadString = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'CAN26-Webhooks/1.0',
    };

    // Ajouter la signature si un secret est fourni
    if (secret) {
      headers['X-Webhook-Signature'] = generateSignature(payloadString, secret);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: AbortSignal.timeout(10000), // Timeout de 10 secondes
    });

    return response.ok;
  } catch (error) {
    console.error(`Webhook failed for ${url}:`, error);
    return false;
  }
}

/**
 * Déclenche tous les webhooks actifs pour un événement donné
 */
export async function triggerWebhooks(
  eventType: WebhookEventType,
  data: Record<string, unknown>,
  options: WebhookTriggerOptions = {}
): Promise<void> {
  try {
    // Récupérer tous les webhooks actifs pour cet événement
    const webhooks = await prisma.webhook.findMany({
      where: {
        isActive: true,
        events: {
          has: eventType,
        },
        // Filtrer par tournoi si spécifié
        ...(options.tournamentId && {
          OR: [
            { tournamentId: options.tournamentId },
            { tournamentId: null }, // Webhooks globaux
          ],
        }),
        // Filtrer par équipe si spécifié
        ...(options.teamId && {
          OR: [
            { teamId: options.teamId },
            { teamId: null }, // Webhooks globaux
          ],
        }),
      },
    });

    if (webhooks.length === 0) {
      return;
    }

    // Construire le payload
    const payload: WebhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    // Envoyer les webhooks en parallèle
    const results = await Promise.allSettled(
      webhooks.map(async (webhook) => {
        const success = await sendWebhookRequest(
          webhook.url,
          payload,
          webhook.secret || undefined
        );

        // Mettre à jour les statistiques du webhook
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            lastTriggeredAt: new Date(),
            triggerCount: { increment: 1 },
            ...(success ? {} : { failureCount: { increment: 1 } }),
          },
        });

        return { webhookId: webhook.id, success };
      })
    );

    // Logger les résultats
    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failureCount = results.length - successCount;

    console.log(
      `Webhooks triggered for ${eventType}: ${successCount} succeeded, ${failureCount} failed`
    );
  } catch (error) {
    console.error('Error triggering webhooks:', error);
  }
}

/**
 * Déclenche les webhooks pour le démarrage d'un match
 */
export async function triggerMatchStartedWebhooks(match: {
  id: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  matchDate: Date;
  stage: string;
}): Promise<void> {
  await triggerWebhooks(
    'MATCH_STARTED',
    {
      matchId: match.id,
      tournamentId: match.tournamentId,
      homeTeam: {
        id: match.homeTeamId,
        name: match.homeTeam.name,
      },
      awayTeam: {
        id: match.awayTeamId,
        name: match.awayTeam.name,
      },
      matchDate: match.matchDate.toISOString(),
      stage: match.stage,
    },
    {
      tournamentId: match.tournamentId,
    }
  );
}

/**
 * Déclenche les webhooks pour la fin d'un match
 */
export async function triggerMatchFinishedWebhooks(match: {
  id: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  homeScore: number;
  awayScore: number;
  winnerTeamId: string | null;
  stage: string;
}): Promise<void> {
  await triggerWebhooks(
    'MATCH_FINISHED',
    {
      matchId: match.id,
      tournamentId: match.tournamentId,
      homeTeam: {
        id: match.homeTeamId,
        name: match.homeTeam.name,
      },
      awayTeam: {
        id: match.awayTeamId,
        name: match.awayTeam.name,
      },
      score: {
        home: match.homeScore,
        away: match.awayScore,
      },
      winnerId: match.winnerTeamId,
      stage: match.stage,
    },
    {
      tournamentId: match.tournamentId,
    }
  );
}

/**
 * Déclenche les webhooks pour la mise à jour du score
 */
export async function triggerScoreUpdatedWebhooks(match: {
  id: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  homeScore: number;
  awayScore: number;
}): Promise<void> {
  await triggerWebhooks(
    'SCORE_UPDATED',
    {
      matchId: match.id,
      tournamentId: match.tournamentId,
      homeTeam: {
        id: match.homeTeamId,
        name: match.homeTeam.name,
      },
      awayTeam: {
        id: match.awayTeamId,
        name: match.awayTeam.name,
      },
      score: {
        home: match.homeScore,
        away: match.awayScore,
      },
    },
    {
      tournamentId: match.tournamentId,
    }
  );
}

/**
 * Déclenche les webhooks pour la mise à jour du classement
 */
export async function triggerStandingsUpdatedWebhooks(
  tournamentId: string,
  groupId: string | null,
  standings: Array<{
    position: number;
    teamId: string;
    teamName: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  }>
): Promise<void> {
  await triggerWebhooks(
    'STANDINGS_UPDATED',
    {
      tournamentId,
      groupId,
      standings,
    },
    {
      tournamentId,
    }
  );
}

/**
 * Déclenche les webhooks pour la mise à jour du bracket
 */
export async function triggerBracketUpdatedWebhooks(
  tournamentId: string,
  stage: string,
  message: string
): Promise<void> {
  await triggerWebhooks(
    'BRACKET_UPDATED',
    {
      tournamentId,
      stage,
      message,
    },
    {
      tournamentId,
    }
  );
}
