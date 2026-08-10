/**
 * POST /api/matches/[id]/status
 *
 * Change le status d'un match. Réservé admin ou coach des équipes du match.
 * Body: { status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELED', reason?: string }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { canManageMatch } from '@/lib/utils/permissions';
import { MatchStatus } from '@/prisma/prisma-client/enums';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });

  const matchId = typeof req.query.id === 'string' ? req.query.id : null;
  if (!matchId) return res.status(400).json({ error: 'matchId requis' });

  const allowed = await canManageMatch(dbUser.id, matchId);
  if (!allowed) return res.status(403).json({ error: 'Réservé admin / coach' });

  const body = (req.body ?? {}) as { status?: string; reason?: string };
  if (!body.status || !(body.status in MatchStatus)) {
    return res
      .status(400)
      .json({ error: 'status invalide (SCHEDULED | LIVE | FINISHED | CANCELED)' });
  }

  const { updateMatchStatus } = await import('@/actions/match-events');
  const result = await updateMatchStatus({
    matchId,
    newStatus: body.status as MatchStatus,
    createdById: dbUser.id,
    reason: body.reason,
  });

  if (!result.success) return res.status(400).json({ error: result.error });

  // Match annulé → on rembourse les paris en cours (VOID + crédit Wizebot).
  // settleMatchBets(outcome:null) est idempotent (skip si pool déjà réglé).
  let refund: Awaited<ReturnType<typeof import('@/lib/utils/betting')['settleMatchBets']>> | null = null;
  if (body.status === MatchStatus.CANCELED) {
    try {
      const { settleMatchBets } = await import('@/lib/utils/betting');
      refund = await settleMatchBets({ matchId, outcome: null });
    } catch (err) {
      console.error('[status] remboursement à l’annulation échoué', matchId, err);
    }
  }

  return res.status(200).json({ success: true, ...result.data, refund });
}
