import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { syncClerkUserById } from '@/lib/clerk';
import { reviewJoinRequest, type JoinRequestCode } from '@/lib/utils/join-requests';
import { joinReviewSchema } from '@/lib/utils/validations';

const STATUS: Record<JoinRequestCode, number> = {
  NOT_FOUND: 404,
  CLOSED: 409,
  TEAM_FULL: 409,
  ALREADY_PLAYER: 409,
  ALREADY_PENDING: 409,
  ALREADY_REVIEWED: 409,
  JERSEY_TAKEN: 400,
  FORBIDDEN: 403,
  ERROR: 500,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const requestId = req.query.id;
  if (typeof requestId !== 'string') return res.status(400).json({ error: 'Demande invalide' });

  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const dbUser = await syncClerkUserById(userId);
    if (!dbUser) return res.status(401).json({ error: 'Utilisateur non trouvé' });

    const input = joinReviewSchema.parse(req.body);

    const result = await reviewJoinRequest({
      requestId,
      reviewerId: dbUser.id,
      action: input.action,
      jerseyNumber: input.jerseyNumber,
      position: input.position,
      note: input.note || null,
    });

    if (!result.ok) return res.status(STATUS[result.code]).json({ error: result.message });
    return res.status(200).json({ success: true, ...result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Données invalides', details: error.issues });
    }
    console.error('[api/join-requests/review]', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
