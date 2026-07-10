import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { syncClerkUserById } from '@/lib/clerk';
import { createJoinRequest, type JoinRequestCode } from '@/lib/utils/join-requests';
import { joinRequestSchema } from '@/lib/utils/validations';

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

  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const dbUser = await syncClerkUserById(userId);
    if (!dbUser) return res.status(401).json({ error: 'Utilisateur non trouvé' });

    if (dbUser.role === 'GUEST') {
      return res.status(403).json({ error: 'Tu dois devenir participant avant de rejoindre une équipe.' });
    }

    const input = joinRequestSchema.parse(req.body);

    const result = await createJoinRequest({
      userId: dbUser.id,
      teamId: input.teamId,
      jerseyNumber: input.jerseyNumber,
      position: input.position,
      message: input.message || null,
    });

    if (!result.ok) return res.status(STATUS[result.code]).json({ error: result.message });
    return res.status(200).json({ success: true, id: result.data.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Données invalides', details: error.issues });
    }
    console.error('[api/join-requests/create]', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
