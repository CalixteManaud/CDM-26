import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

/**
 * Endpoint pour récupérer la liste des administrateurs
 * Accessible publiquement (pour affichage dans le modal de remerciement)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
      },
      select: {
        id: true,
        name: true,
        avatar: true,
      },
      orderBy: {
        createdAt: 'asc', // Les premiers admins en premier
      },
    });

    return res.status(200).json(admins);
  } catch (error) {
    console.error('Erreur lors de la récupération des admins:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
