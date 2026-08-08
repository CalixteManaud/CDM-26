/**
 * POST /api/admin/teams/create
 *
 * Crée une équipe (admin uniquement). Body : { name, shortName, logo?,
 * tournamentId, groupId?, coachUserId? }. Contrôle la capacité du tournoi.
 *
 * Suit la convention Pages Router (Prisma inline, pas d'appel aux Server
 * Actions qui dépendent de currentUser()/revalidatePath).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { isSiteAdmin } from '@/lib/utils/permissions';
import prisma from '@/lib/prisma';
import { teamSchema } from '@/lib/utils/validations';
import { ensureCoachAsPlayer } from '@/lib/utils/coach-player';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });
  if (!(await isSiteAdmin(dbUser.id))) return res.status(403).json({ error: 'Réservé aux administrateurs' });

  try {
    const parsed = teamSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
    }
    const data = parsed.data;
    const coachUserId = typeof req.body?.coachUserId === 'string' ? req.body.coachUserId : null;

    // Contrôle de capacité : nb de groupes × équipes par groupe.
    const tournament = await prisma.tournament.findUnique({
      where: { id: data.tournamentId },
      select: { groupCount: true, teamsPerGroup: true, _count: { select: { teams: true } } },
    });
    if (!tournament) return res.status(404).json({ error: 'Tournoi introuvable' });
    const capacity = tournament.groupCount * tournament.teamsPerGroup;
    if (tournament._count.teams >= capacity) {
      return res.status(400).json({
        error: `Tournoi complet : ${tournament._count.teams}/${capacity} équipes.`,
      });
    }

    const team = await prisma.team.create({
      data: {
        name: data.name,
        shortName: data.shortName,
        logo: data.logo || null,
        tournamentId: data.tournamentId,
        groupId: data.groupId || null,
        coachUserId,
      },
      select: { id: true },
    });

    // Le coach est aussi joueur → il intègre l'effectif.
    if (coachUserId) {
      await ensureCoachAsPlayer({ teamId: team.id, userId: coachUserId });
    }

    return res.status(200).json({ success: true, id: team.id });
  } catch (error: unknown) {
    const e = error as { code?: string; meta?: { target?: string[] } };
    if (e.code === 'P2002' && e.meta?.target?.includes('shortName')) {
      return res.status(400).json({ error: `Le nom court "${req.body?.shortName}" est déjà pris dans ce tournoi.` });
    }
    console.error('Error creating team (admin):', error);
    return res.status(500).json({ error: "Erreur lors de la création de l'équipe" });
  }
}
