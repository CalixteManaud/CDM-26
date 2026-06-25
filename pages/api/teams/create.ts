import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import prisma from '@/lib/prisma';
import { teamSchema } from '@/lib/utils/validations';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Sync the Clerk user to our database
    const dbUser = await syncClerkUserById(userId);
    if (!dbUser) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    // Validate input
    const validated = teamSchema.parse(req.body);

    // Contrôle de capacité : nb de groupes × équipes par groupe.
    const tournament = await prisma.tournament.findUnique({
      where: { id: validated.tournamentId },
      select: { groupCount: true, teamsPerGroup: true, _count: { select: { teams: true } } },
    });
    if (!tournament) {
      return res.status(404).json({ error: 'Tournoi introuvable' });
    }
    const capacity = tournament.groupCount * tournament.teamsPerGroup;
    if (tournament._count.teams >= capacity) {
      return res.status(400).json({
        error: `Tournoi complet : ${tournament._count.teams}/${capacity} équipes. Aucune place disponible.`,
      });
    }

    // Create the team with the current user as coach
    const team = await prisma.team.create({
      data: {
        name: validated.name,
        shortName: validated.shortName,
        logo: validated.logo || null,
        tournamentId: validated.tournamentId,
        groupId: validated.groupId || null,
        coachUserId: dbUser.id, // Auto-assign creator as coach
      },
    });

    return res.status(200).json({ id: team.id });
  } catch (error: any) {
    console.error('Error creating team:', error);

    // Handle Prisma unique constraint error
    if (error.code === 'P2002') {
      const fields = error.meta?.target as string[] | undefined;
      if (fields?.includes('shortName')) {
        return res.status(400).json({
          error: `Le nom court "${req.body.shortName}" est déjà utilisé dans ce tournoi. Choisis un autre nom court.`
        });
      }
    }

    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
