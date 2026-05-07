import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserFromReq } from '@/lib/clerk';
import { generateGroupMatches } from '@/lib/utils/group-match-generator';
import { generateKnockoutBracket } from '@/lib/utils/bracket-generator';

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
      return res.status(403).json({ error: 'Permissions insuffisantes - Admin requis' });
    }

    const tournamentId = req.query.id as string;
    const { type } = req.body;

    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID requis' });
    }

    if (type !== 'group' && type !== 'knockout') {
      return res.status(400).json({ error: 'Type invalide. Doit être "group" ou "knockout"' });
    }

    // Générer les matchs selon le type
    if (type === 'group') {
      const result = await generateGroupMatches(tournamentId);
      return res.status(200).json({
        success: true,
        data: {
          matchesCreated: result.matchesCreated,
          groups: result.groups,
          message: `${result.matchesCreated} matchs de groupe créés avec succès pour ${result.groups} groupes`,
        },
      });
    } else {
      const result = await generateKnockoutBracket(tournamentId);
      return res.status(200).json({
        success: true,
        data: {
          stage: result.stage,
          matchesCreated: result.matchesCreated,
          qualifiedTeams: result.qualifiedTeams,
          message: `Bracket d'élimination créé: ${result.matchesCreated} matchs en ${result.stage}`,
        },
      });
    }
  } catch (error: unknown) {
    console.error('Error generating matches:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur';
    return res.status(500).json({
      error: errorMessage,
    });
  }
}
