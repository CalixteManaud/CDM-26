/**
 * POST /api/invites/[token]/accept
 *
 * Le joueur invité crée son équipe et en devient coach. Contrôles : destinataire
 * correct, invitation valide, nom unique (par tournoi, insensible à la casse),
 * nom court unique, logo obligatoire, 1 équipe max / joueur / tournoi.
 *
 * Body: { name, shortName, logo }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import prisma from '@/lib/prisma';
import { TeamInviteStatus, NotificationType } from '@/prisma/prisma-client/enums';
import { loadInviteForUser, isTeamNameTaken, isTeamShortNameTaken } from '@/lib/utils/team-invites';
import { createNotification } from '@/lib/utils/notifications';

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
  const { invite } = loaded;

  const body = (req.body ?? {}) as { name?: unknown; shortName?: unknown; logo?: unknown };
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const shortName = typeof body.shortName === 'string' ? body.shortName.trim().toUpperCase() : '';
  const logo = typeof body.logo === 'string' ? body.logo.trim() : '';

  if (name.length < 2) return res.status(400).json({ error: 'Le nom doit faire au moins 2 caractères', code: 'NAME' });
  if (shortName.length < 2 || shortName.length > 3) {
    return res.status(400).json({ error: 'Le nom court doit faire 2 à 3 caractères', code: 'SHORT' });
  }
  if (!logo) return res.status(400).json({ error: 'Le logo est obligatoire', code: 'LOGO' });

  // 1 équipe / joueur / tournoi
  const alreadyCoach = await prisma.team.findFirst({
    where: { tournamentId: invite.tournamentId, coachUserId: dbUser.id },
    select: { id: true },
  });
  if (alreadyCoach) {
    return res.status(400).json({ error: 'Tu as déjà une équipe sur ce tournoi.', code: 'ALREADY_TEAM' });
  }

  if (await isTeamNameTaken(invite.tournamentId, name)) {
    return res.status(409).json({ error: `Le nom « ${name} » est déjà pris sur ce tournoi.`, code: 'NAME_TAKEN' });
  }
  if (await isTeamShortNameTaken(invite.tournamentId, shortName)) {
    return res.status(409).json({ error: `Le nom court « ${shortName} » est déjà pris.`, code: 'SHORT_TAKEN' });
  }

  // Contrôle de capacité du tournoi
  const tournament = await prisma.tournament.findUnique({
    where: { id: invite.tournamentId },
    select: { groupCount: true, teamsPerGroup: true, _count: { select: { teams: true } }, name: true },
  });
  if (!tournament) return res.status(404).json({ error: 'Tournoi introuvable' });
  if (tournament._count.teams >= tournament.groupCount * tournament.teamsPerGroup) {
    return res.status(400).json({ error: 'Tournoi complet — plus de place pour une équipe.', code: 'FULL' });
  }

  try {
    const team = await prisma.$transaction(async (tx) => {
      const created = await tx.team.create({
        data: {
          name,
          shortName,
          logo,
          tournamentId: invite.tournamentId,
          coachUserId: dbUser.id,
        },
        select: { id: true, name: true },
      });
      await tx.teamCreationInvite.update({
        where: { id: invite.id },
        data: { status: TeamInviteStatus.ACCEPTED, teamId: created.id, respondedAt: new Date() },
      });
      return created;
    });

    // Prévenir l'admin émetteur (progression visible).
    const full = await prisma.teamCreationInvite.findUnique({
      where: { id: invite.id },
      select: { createdById: true },
    });
    if (full?.createdById) {
      await createNotification({
        userId: full.createdById,
        type: NotificationType.SYSTEM,
        title: 'Équipe créée ✅',
        body: `${dbUser.username || dbUser.name} a créé « ${team.name} » sur ${tournament.name}.`,
        href: '/admin/invitations',
      });
    }

    return res.status(200).json({ success: true, teamId: team.id });
  } catch (error: unknown) {
    const e = error as { code?: string; meta?: { target?: string[] } };
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'Nom ou nom court déjà pris sur ce tournoi.', code: 'CONFLICT' });
    }
    console.error('[invites/accept]', error);
    return res.status(500).json({ error: "Erreur lors de la création de l'équipe" });
  }
}
