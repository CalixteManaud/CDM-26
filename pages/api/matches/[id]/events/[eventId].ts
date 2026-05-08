/**
 * DELETE /api/matches/[id]/events/[eventId]
 *
 * Supprime un event (erreur de saisie). Réservé admin/coach.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { canManageMatch } from '@/lib/utils/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const matchId = typeof req.query.id === 'string' ? req.query.id : null;
  const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : null;
  if (!matchId || !eventId) return res.status(400).json({ error: 'matchId et eventId requis' });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });

  const allowed = await canManageMatch(dbUser.id, matchId);
  if (!allowed) return res.status(403).json({ error: 'Réservé admin / coach' });

  const { deleteMatchEvent } = await import('@/actions/match-events');
  const result = await deleteMatchEvent(eventId);
  if (!result.success) return res.status(500).json({ error: result.error });
  return res.status(200).json({ success: true });
}
