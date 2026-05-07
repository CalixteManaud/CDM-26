import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

/**
 * Endpoint admin pour régénérer les matchs de barrage avec la structure correcte :
 * - Quart de finale: Algérie vs Maroc
 * - Demi-finale 1: Sénégal vs Vainqueur QF
 * - Demi-finale 2: Mali vs Tunisie
 * - Finale: Créée automatiquement après les demi-finales
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  // Vérifier que l'utilisateur est admin
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès refusé - Admin uniquement' });
  }

  const { id: tournamentId } = req.query;

  if (typeof tournamentId !== 'string') {
    return res.status(400).json({ error: 'ID de tournoi invalide' });
  }

  try {
    // IDs des équipes pour les barrages
    const teamIds = {
      algerie: '4ed571be-b9f5-468c-9bc1-b4fb3468927c',
      maroc: '5a40b4d4-9d7a-4fc7-8f63-78593bbff060',
      senegal: '6a028ecd-acf6-4689-a249-e6936417bb32',
      mali: 'e6cbd9fc-6347-4174-b0ce-139da728ac8b',
      tunisie: '083e68e2-d7aa-476c-a727-a33395f16edd',
    };

    const baseDate = Date.now();

    // 1. Supprimer tous les matchs PLAYOFF existants
    const deletedMatches = await prisma.match.deleteMany({
      where: {
        tournamentId,
        stage: 'PLAYOFF',
      },
    });

    // 2. Créer le quart de finale: Algérie vs Maroc
    const quarterFinal = await prisma.match.create({
      data: {
        tournamentId,
        stage: 'PLAYOFF',
        status: 'SCHEDULED',
        matchDate: new Date(baseDate + 1 * 24 * 60 * 60 * 1000),
        homeTeamId: teamIds.algerie,
        awayTeamId: teamIds.maroc,
      },
    });

    // 3. Créer la demi-finale 1: Sénégal vs Winner QF (temporaire: Algérie)
    const semi1 = await prisma.match.create({
      data: {
        tournamentId,
        stage: 'PLAYOFF',
        status: 'SCHEDULED',
        matchDate: new Date(baseDate + 3 * 24 * 60 * 60 * 1000),
        homeTeamId: teamIds.senegal,
        awayTeamId: teamIds.algerie, // Sera mis à jour avec le vainqueur du QF
      },
    });

    // 4. Créer la demi-finale 2: Mali vs Tunisie
    const semi2 = await prisma.match.create({
      data: {
        tournamentId,
        stage: 'PLAYOFF',
        status: 'SCHEDULED',
        matchDate: new Date(baseDate + 3 * 24 * 60 * 60 * 1000),
        homeTeamId: teamIds.mali,
        awayTeamId: teamIds.tunisie,
      },
    });

    // La finale sera créée automatiquement par bracket-progression.ts
    // après que les deux demi-finales soient terminées

    return res.status(200).json({
      success: true,
      message: 'Matchs de barrage régénérés avec succès',
      deleted: deletedMatches.count,
      created: {
        quarterFinal: quarterFinal.id,
        semi1: semi1.id,
        semi2: semi2.id,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la régénération des matchs de barrage:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
