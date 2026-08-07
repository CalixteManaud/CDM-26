/**
 * POST /api/admin/team-invites/[id]/revoke
 * Admin : annule une invitation non encore acceptée.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { isSiteAdmin } from '@/lib/utils/permissions';
import prisma from '@/lib/prisma';
import { TeamInviteStatus } from '@/prisma/prisma-client/enums';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });
  if (!(await isSiteAdmin(dbUser.id))) return res.status(403).json({ error: 'Réservé aux administrateurs' });

  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id) return res.status(400).json({ error: 'id requis' });

  const invite = await prisma.teamCreationInvite.findUnique({ where: { id }, select: { status: true } });
  if (!invite) return res.status(404).json({ error: 'Invitation introuvable' });
  if (invite.status === TeamInviteStatus.ACCEPTED) {
    return res.status(400).json({ error: 'Invitation déjà acceptée — impossible de révoquer' });
  }

  await prisma.teamCreationInvite.update({
    where: { id },
    data: { status: TeamInviteStatus.REVOKED, respondedAt: new Date() },
  });

  return res.status(200).json({ success: true });
}
