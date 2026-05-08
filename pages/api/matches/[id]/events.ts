/**
 * GET  /api/matches/[id]/events           — list (optionnel ?since=ISO)
 * POST /api/matches/[id]/events           — create (admin/coach)
 *
 * Le GET est public (pas d'auth) — les events sont visibles par tous les
 * viewers. Le POST est réservé admin / coach.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { canManageMatch } from '@/lib/utils/permissions';
import { MatchEventType } from '@/prisma/prisma-client/enums';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const matchId = typeof req.query.id === 'string' ? req.query.id : null;
  if (!matchId) return res.status(400).json({ error: 'matchId requis' });

  if (req.method === 'GET') {
    const since = typeof req.query.since === 'string' ? req.query.since : null;
    const { getMatchEventsSince, getMatchEvents } = await import('@/actions/match-events');
    const result = since
      ? await getMatchEventsSince(matchId, since)
      : await getMatchEvents(matchId);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.setHeader('Cache-Control', 'public, max-age=2, stale-while-revalidate=4');
    return res.status(200).json({ events: result.data ?? [] });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // POST : auth + permission
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });

  const allowed = await canManageMatch(dbUser.id, matchId);
  if (!allowed) return res.status(403).json({ error: 'Réservé admin / coach' });

  const body = (req.body ?? {}) as {
    type?: string;
    minute?: number | string | null;
    teamId?: string | null;
    playerId?: string | null;
    description?: string | null;
  };

  if (!body.type || !(body.type in MatchEventType)) {
    return res.status(400).json({
      error:
        'type invalide (MATCH_STARTED | HALF_TIME | SECOND_HALF | MATCH_ENDED | GOAL | OWN_GOAL | PENALTY_SCORED | PENALTY_MISSED | YELLOW_CARD | RED_CARD | SUBSTITUTION | COMMENT)',
    });
  }

  const minute =
    body.minute === null || body.minute === undefined || body.minute === ''
      ? null
      : Number.parseInt(String(body.minute), 10);

  const { createMatchEvent } = await import('@/actions/match-events');
  const result = await createMatchEvent({
    matchId,
    type: body.type as MatchEventType,
    minute: Number.isFinite(minute as number) ? (minute as number) : null,
    teamId: body.teamId || null,
    playerId: body.playerId || null,
    description: body.description?.trim() || null,
    createdById: dbUser.id,
  });

  if (!result.success) return res.status(500).json({ error: result.error });
  return res.status(200).json({ success: true, event: result.data });
}
