import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { canManageTeam } from '@/lib/utils/permissions';
import prisma from '@/lib/prisma';
import { playerSchema } from '@/lib/utils/validations';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const dbUser = await syncClerkUserById(userId);
    if (!dbUser) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    // Validate input
    const validated = playerSchema.parse(req.body);

    // Check if user can manage this team (admin OR team coach)
    const canManage = await canManageTeam(dbUser.id, validated.teamId);
    if (!canManage) {
      return res.status(403).json({ error: 'Permissions insuffisantes' });
    }

    // Check if user is already in a team for this tournament
    const team = await prisma.team.findUnique({
      where: { id: validated.teamId },
      select: { tournamentId: true },
    });

    if (team) {
      const existingPlayer = await prisma.player.findFirst({
        where: {
          userId: validated.userId,
          team: {
            tournamentId: team.tournamentId,
          },
        },
      });

      if (existingPlayer) {
        return res.status(400).json({
          error: 'Ce joueur est déjà dans une équipe de ce tournoi',
        });
      }
    }

    // Create the player
    const player = await prisma.player.create({
      data: {
        jerseyNumber: validated.jerseyNumber,
        position: validated.position,
        userId: validated.userId,
        teamId: validated.teamId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({ id: player.id });
  } catch (error: any) {
    console.error('Error creating player:', error);

    // Handle Prisma unique constraint error
    if (error.code === 'P2002') {
      const fields = error.meta?.target as string[] | undefined;
      if (fields?.includes('jerseyNumber')) {
        return res.status(400).json({
          error: `Le numéro ${req.body.jerseyNumber} est déjà pris dans cette équipe. Choisis un autre numéro.`
        });
      }
    }

    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
