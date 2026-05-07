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
