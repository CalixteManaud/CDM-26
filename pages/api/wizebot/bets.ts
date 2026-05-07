/**
 * Endpoint inbound Wizebot — appelé quand un viewer parie en chat Twitch.
 *
 * Configuration côté Wizebot ("Action web" custom command):
 *   POST {SITE_URL}/api/wizebot/bets
 *   Header: x-wizebot-secret: {WIZEBOT_INBOUND_SECRET}
 *   Header: x-wizebot-event-id: {un ID unique pour idempotence (timestamp+user)}
 *   Body JSON: {
 *     "twitchUsername": "{USER}",
 *     "matchId":        "{ARG1}",
 *     "outcome":        "{ARG2}",   // HOME | DRAW | AWAY
 *     "points":          {ARG3}
 *   }
 *
 * Réponses:
 *   200 { success: true, betId, oddsAtPlacement }
 *   400 { error: "...", code: "..." }   → message renvoyé en chat par Wizebot
 *   401 { error: "Invalid secret" }
 *   404 { error: "Compte non lié" }     → invite à lier sur cdm26.com/profile
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import {
  verifyWizebotInbound,
  normalizeTwitchUsername,
  WizebotConfigError,
} from '@/lib/wizebot';
import { placeBet, BettingError } from '@/lib/utils/betting';
import { BetOutcome } from '@/prisma/prisma-client/enums';

type IncomingBody = {
  twitchUsername?: unknown;
  matchId?: unknown;
  outcome?: unknown;
  points?: unknown;
};

function parseOutcome(raw: unknown): BetOutcome | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toUpperCase();
  if (v === 'HOME' || v === 'HOME_WIN' || v === 'DOMICILE') return BetOutcome.HOME_WIN;
  if (v === 'AWAY' || v === 'AWAY_WIN' || v === 'EXTERIEUR' || v === 'EXTÉRIEUR') return BetOutcome.AWAY_WIN;
  if (v === 'DRAW' || v === 'NUL' || v === 'TIE') return BetOutcome.DRAW;
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Validation du secret partagé
  try {
    const secret = req.headers['x-wizebot-secret'];
    if (!verifyWizebotInbound(secret)) {
      return res.status(401).json({ error: 'Invalid secret' });
    }
  } catch (err) {
    if (err instanceof WizebotConfigError) {
      return res.status(500).json({ error: err.message });
    }
    throw err;
  }

  // 2. Parsing du body
  const body = (req.body ?? {}) as IncomingBody;
  const twitchUsernameRaw = typeof body.twitchUsername === 'string' ? body.twitchUsername : null;
  const matchId = typeof body.matchId === 'string' ? body.matchId : null;
  const outcome = parseOutcome(body.outcome);
  const pointsNum =
    typeof body.points === 'number'
      ? body.points
      : typeof body.points === 'string'
        ? Number.parseInt(body.points, 10)
        : NaN;

  if (!twitchUsernameRaw || !matchId || !outcome || !Number.isFinite(pointsNum)) {
    return res.status(400).json({
      error: 'Format attendu: twitchUsername, matchId, outcome (HOME|DRAW|AWAY), points',
      code: 'BAD_REQUEST',
    });
  }

  const twitchUsername = normalizeTwitchUsername(twitchUsernameRaw);
  const eventId =
    (req.headers['x-wizebot-event-id'] as string | undefined) ??
    `${twitchUsername}:${matchId}:${Date.now()}`;

  // 3. Lookup du user CDM 26 par twitchUsername
  const user = await prisma.user.findUnique({
    where: { twitchUsername },
  });

  if (!user) {
    return res.status(404).json({
      error: `@${twitchUsername} n'a pas lié son compte CDM 26. Va sur cdm26.com/profile pour le lier.`,
      code: 'ACCOUNT_NOT_LINKED',
    });
  }

  // 4. Placement du pari (logique métier)
  try {
    const result = await placeBet({
      userId: user.id,
      matchId,
      outcome,
      pointsWagered: pointsNum,
      wizebotEventId: eventId,
    });

    return res.status(200).json({
      success: true,
      betId: result.betId,
      oddsAtPlacement: result.oddsAtPlacement,
      message: `Pari enregistré : ${pointsNum} pts sur ${outcome} @${result.oddsAtPlacement}`,
    });
  } catch (err) {
    if (err instanceof BettingError) {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    console.error('[wizebot/bets] internal error:', err);
    return res.status(500).json({ error: 'Erreur interne', code: 'INTERNAL' });
  }
}
