import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { importTeamsFromTournament } from '@/actions/tournaments';

/**
 * POST /api/tournaments/[id]/import-teams
 *
 * Body: { sourceId: string, teamIds?: string[] } — clone des équipes du source.
 *
 * Précondition : le tournoi cible (`[id]`) doit avoir assez de places libres
 * (capacité = groupCount × teamsPerGroup). Admin uniquement.
 * Clone Team + Players (groupId du target reste null).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const dbUser = await syncClerkUserById(userId);
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Permissions insuffisantes - Admin requis' });
    }

    const targetId = req.query.id as string;
    const { sourceId, teamIds } = req.body as { sourceId?: unknown; teamIds?: unknown };

    if (!targetId || typeof sourceId !== 'string' || !sourceId) {
      return res.status(400).json({ error: 'targetId et sourceId requis' });
    }

    const teamIdsArray =
      Array.isArray(teamIds) && teamIds.every((id) => typeof id === 'string')
        ? (teamIds as string[])
        : undefined;

    const result = await importTeamsFromTournament(targetId, sourceId, teamIdsArray);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error importing teams:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur serveur',
    });
  }
}
