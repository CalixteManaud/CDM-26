import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserFromReq } from '@/lib/clerk';
import { generateGroupMatches } from '@/lib/utils/group-match-generator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vérifier l'authentification
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Vérifier que l'utilisateur est admin
    const dbUser = await syncClerkUserFromReq(req);
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Permissions insuffisantes' });
    }

    const { tournamentId } = req.body;

    if (!tournamentId) {
      return res.status(400).json({ error: 'tournamentId requis' });
    }

    // Générer les matchs de groupe
    const result = await generateGroupMatches(tournamentId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error generating group matches:', error);
    return res.status(500).json({
      error: error.message || 'Erreur lors de la génération des matchs',
    });
  }
}
