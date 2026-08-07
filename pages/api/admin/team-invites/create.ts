/**
 * POST /api/admin/team-invites/create
 *
 * Admin : génère des invitations « crée ton équipe » pour un ou plusieurs
 * joueurs sur un tournoi donné. Notifie chaque joueur (in-app + email optionnel).
 *
 * Body: { tournamentId: string, targetUserIds: string[] }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { isSiteAdmin } from '@/lib/utils/permissions';
import prisma from '@/lib/prisma';
import { TeamInviteStatus } from '@/prisma/prisma-client/enums';
import {
  generateInviteToken,
  inviteExpiry,
  notifyInviteTarget,
  OPEN_INVITE_STATUSES,
} from '@/lib/utils/team-invites';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });
  if (!(await isSiteAdmin(dbUser.id))) return res.status(403).json({ error: 'Réservé aux administrateurs' });

  const body = (req.body ?? {}) as { tournamentId?: unknown; targetUserIds?: unknown };
  const tournamentId = typeof body.tournamentId === 'string' ? body.tournamentId : null;
  const targetUserIds = Array.isArray(body.targetUserIds)
    ? [...new Set(body.targetUserIds.filter((x): x is string => typeof x === 'string'))]
    : [];

  if (!tournamentId || targetUserIds.length === 0) {
    return res.status(400).json({ error: 'tournamentId et au moins un joueur sont requis' });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, name: true },
  });
  if (!tournament) return res.status(404).json({ error: 'Tournoi introuvable' });

  const created: string[] = [];
  const skipped: Array<{ userId: string; reason: string }> = [];

  for (const targetId of targetUserIds) {
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, username: true, email: true },
    });
    if (!target) {
      skipped.push({ userId: targetId, reason: 'Utilisateur introuvable' });
      continue;
    }

    // 1 équipe / joueur / tournoi : s'il coache déjà une équipe ici, on saute.
    const alreadyCoach = await prisma.team.findFirst({
      where: { tournamentId, coachUserId: targetId },
      select: { id: true },
    });
    if (alreadyCoach) {
      skipped.push({ userId: targetId, reason: 'Coache déjà une équipe sur ce tournoi' });
      continue;
    }

    // Invitation active déjà en cours → on ne duplique pas (utiliser « renvoyer »).
    const openInvite = await prisma.teamCreationInvite.findFirst({
      where: { targetUserId: targetId, tournamentId, status: { in: OPEN_INVITE_STATUSES } },
      select: { id: true },
    });
    if (openInvite) {
      skipped.push({ userId: targetId, reason: 'Invitation déjà en cours' });
      continue;
    }

    const token = generateInviteToken();
    await prisma.teamCreationInvite.create({
      data: {
        token,
        targetUserId: targetId,
        tournamentId,
        createdById: dbUser.id,
        status: TeamInviteStatus.PENDING,
        expiresAt: inviteExpiry(),
      },
    });

    await notifyInviteTarget({
      userId: target.id,
      userEmail: target.email,
      userName: target.username || target.name,
      token,
      tournamentName: tournament.name,
    });

    created.push(targetId);
  }

  return res.status(200).json({ success: true, created: created.length, skipped });
}
