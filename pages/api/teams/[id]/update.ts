import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { syncClerkUserById } from '@/lib/clerk';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  const teamId = req.query.id as string;
  const { name, shortName, logo } = req.body;

  if (!teamId) {
    return res.status(400).json({ error: 'ID de l\'équipe requis' });
  }

  try {
    // Récupérer l'utilisateur
    const dbUser = await syncClerkUserById(userId);

    if (!dbUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Récupérer l'équipe
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { coach: true },
    });

    if (!team) {
      return res.status(404).json({ error: 'Équipe non trouvée' });
    }

    // Vérifier les permissions (admin ou coach de l'équipe)
    const canManage = dbUser.role === 'ADMIN' || dbUser.id === team.coachUserId;

    if (!canManage) {
      return res.status(403).json({ error: 'Non autorisé à modifier cette équipe' });
    }

    // Valider les données
    if (name && name.trim().length < 3) {
      return res.status(400).json({ error: 'Le nom doit contenir au moins 3 caractères' });
    }

    if (shortName && shortName.trim().length < 2) {
      return res.status(400).json({ error: 'Le nom court doit contenir au moins 2 caractères' });
    }

    if (shortName && shortName.trim().length > 5) {
      return res.status(400).json({ error: 'Le nom court ne peut pas dépasser 5 caractères' });
    }

    // Mettre à jour l'équipe
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(name && { name: name.trim() }),
        ...(shortName && { shortName: shortName.trim().toUpperCase() }),
        ...(logo !== undefined && { logo }), // Permet de supprimer le logo en passant null
      },
      include: {
        tournament: true,
        group: true,
        coach: true,
      },
    });

    return res.status(200).json({
      success: true,
      team: updatedTeam,
    });
  } catch (error) {
    console.error('Error updating team:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'équipe' });
  }
}
