import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { isSiteAdmin } from '@/lib/utils/permissions';
import { tournamentSchema } from '@/lib/utils/validations';

/**
 * POST /api/tournaments/create
 * Crée un tournoi + ses groupes (admin only).
 *
 * NOTE: Cette route existe parce qu'on est en Pages Router. Les Server
 * Actions de `actions/tournaments.ts` ne sont PAS appelables depuis du
 * code client (handlers React) — le bundler tenterait d'embarquer
 * Prisma + `server-only` dans le bundle navigateur. Pour les mutations
 * client → serveur, on passe par une API route.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId: clerkUserId } = getAuth(req);
    if (!clerkUserId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const admin = await isSiteAdmin(user.id);
    if (!admin) {
      return res.status(403).json({ error: 'Accès refusé — Admin requis' });
    }

    const parsed = tournamentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Données invalides',
      });
    }

    const { name, startDate, teamsPerGroup, playersPerTeam, groupCount } = parsed.data;

    const tournament = await prisma.$transaction(async (tx) => {
      const created = await tx.tournament.create({
        data: { name, startDate, teamsPerGroup, playersPerTeam, groupCount },
      });

      const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      await tx.group.createMany({
        data: Array.from({ length: groupCount }).map((_, i) => ({
          name: `Groupe ${groupNames[i]}`,
          position: i + 1,
          tournamentId: created.id,
        })),
      });

      return created;
    });

    return res.status(200).json({ id: tournament.id });
  } catch (error) {
    console.error('Erreur lors de la création du tournoi:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
