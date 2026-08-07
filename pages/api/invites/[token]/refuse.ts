/**
 * POST /api/invites/[token]/refuse
 * Le joueur invité décline l'invitation.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import prisma from '@/lib/prisma';
import { TeamInviteStatus } from '@/prisma/prisma-client/enums';
import { loadInviteForUser } from '@/lib/utils/team-invites';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });

  const token = typeof req.query.token === 'string' ? req.query.token : null;
  if (!token) return res.status(400).json({ error: 'Token requis' });

  const loaded = await loadInviteForUser(token, dbUser.id);
  if (!loaded.ok) return res.status(loaded.status).json({ error: loaded.error });

  await prisma.teamCreationInvite.update({
    where: { id: loaded.invite.id },
    data: { status: TeamInviteStatus.REFUSED, respondedAt: new Date() },
  });

  return res.status(200).json({ success: true });
}
