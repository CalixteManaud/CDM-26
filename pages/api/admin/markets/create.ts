/**
 * POST /api/admin/markets/create
 *
 * Crée un marché pour un match ou un tournoi (admin-only).
 * Body: {
 *   type: 'MATCH_EXACT_SCORE' | 'MATCH_TOTAL_GOALS' | 'MATCH_BTTS'
 *       | 'TOURNAMENT_TOP_SCORER' | 'TOURNAMENT_MVP' | 'TOURNAMENT_WINNER',
 *   matchId?: string,
 *   tournamentId?: string,
 *   closesAt: string (ISO),
 *   housePercentage?: number,
 *   line?: string,           // pour MATCH_TOTAL_GOALS ex "2.5"
 *   maxGoals?: number,       // pour MATCH_EXACT_SCORE
 *   playerIds?: string[],    // pour TOURNAMENT_TOP_SCORER / MVP
 *   teamIds?: string[],      // pour TOURNAMENT_WINNER
 * }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { isSiteAdmin } from '@/lib/utils/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });

  const admin = await isSiteAdmin(dbUser.id);
  if (!admin) return res.status(403).json({ error: 'Réservé aux admins' });

  const body = (req.body ?? {}) as {
    type?: string;
    matchId?: string;
    tournamentId?: string;
    closesAt?: string;
    housePercentage?: number;
    line?: string;
    maxGoals?: number;
    playerIds?: string[];
    teamIds?: string[];
  };

  if (!body.type || !body.closesAt) {
    return res.status(400).json({ error: 'type et closesAt requis' });
  }
  const closesAt = new Date(body.closesAt);
  if (Number.isNaN(closesAt.getTime())) {
    return res.status(400).json({ error: 'closesAt invalide' });
  }

  const {
    adminCreateMatchExactScoreMarket,
    adminCreateMatchTotalGoalsMarket,
    adminCreateMatchBttsMarket,
    adminCreateTournamentPlayerMarket,
    adminCreateTournamentWinnerMarket,
  } = await import('@/actions/markets');

  let result;
  switch (body.type) {
    case 'MATCH_EXACT_SCORE':
      if (!body.matchId) return res.status(400).json({ error: 'matchId requis' });
      result = await adminCreateMatchExactScoreMarket({
        matchId: body.matchId,
        closesAt,
        housePercentage: body.housePercentage,
        maxGoals: body.maxGoals,
      });
      break;
    case 'MATCH_TOTAL_GOALS':
      if (!body.matchId || !body.line)
        return res.status(400).json({ error: 'matchId et line requis' });
      result = await adminCreateMatchTotalGoalsMarket({
        matchId: body.matchId,
        line: body.line,
        closesAt,
        housePercentage: body.housePercentage,
      });
      break;
    case 'MATCH_BTTS':
      if (!body.matchId) return res.status(400).json({ error: 'matchId requis' });
      result = await adminCreateMatchBttsMarket({
        matchId: body.matchId,
        closesAt,
        housePercentage: body.housePercentage,
      });
      break;
    case 'TOURNAMENT_TOP_SCORER':
    case 'TOURNAMENT_MVP':
      if (!body.tournamentId)
        return res.status(400).json({ error: 'tournamentId requis' });
      result = await adminCreateTournamentPlayerMarket({
        tournamentId: body.tournamentId,
        type: body.type,
        closesAt,
        housePercentage: body.housePercentage,
        playerIds: body.playerIds,
      });
      break;
    case 'TOURNAMENT_WINNER':
      if (!body.tournamentId)
        return res.status(400).json({ error: 'tournamentId requis' });
      result = await adminCreateTournamentWinnerMarket({
        tournamentId: body.tournamentId,
        closesAt,
        housePercentage: body.housePercentage,
        teamIds: body.teamIds,
      });
      break;
    default:
      return res.status(400).json({ error: `Type inconnu : ${body.type}` });
  }

  if (!result.success) return res.status(500).json({ error: result.error });
  return res.status(200).json({ success: true, market: result.data });
}
