import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { applyTournamentDraw } from '@/actions/tournaments';

/**
 * POST /api/tournaments/[id]/draw
 *
 * Body: { assignments: { teamId: string, groupId: string }[] }
 *
 * Applique le résultat d'un tirage au sort en une transaction. Admin uniquement.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const dbUser = await syncClerkUserById(userId);
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Permissions insuffisantes - Admin requis' });
    }

    const tournamentId = req.query.id as string;
    const { assignments } = req.body as { assignments?: unknown };

    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID requis' });
    }
    if (!Array.isArray(assignments)) {
      return res.status(400).json({ error: 'assignments doit être un tableau' });
    }

    const valid = assignments.every(
      (a): a is { teamId: string; groupId: string } =>
        typeof a === 'object' &&
        a !== null &&
        typeof (a as { teamId?: unknown }).teamId === 'string' &&
        typeof (a as { groupId?: unknown }).groupId === 'string'
    );
    if (!valid) {
      return res.status(400).json({ error: 'Chaque assignation doit avoir teamId et groupId' });
    }

    const result = await applyTournamentDraw(
      tournamentId,
      assignments as { teamId: string; groupId: string }[]
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error applying draw:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur serveur',
    });
  }
}
