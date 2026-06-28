/**
 * GET /api/matches/[id]/markets
 *
 * Renvoie les marchés additionnels (score exact, total buts, BTTS, DNB, pair/impair)
 * d'un match, avec leurs pools — pour le placement de pari depuis /paris.
 * Lecture seule (cotes publiques) ; le placement reste gardé par /api/markets/place.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const matchId = typeof req.query.id === 'string' ? req.query.id : null;
  if (!matchId) return res.status(400).json({ error: 'id requis' });

  const { getMatchMarkets } = await import('@/actions/markets');
  const result = await getMatchMarkets(matchId);
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  res.setHeader('Cache-Control', 'private, max-age=5, stale-while-revalidate=10');
  return res.status(200).json({ markets: JSON.parse(JSON.stringify(result.data ?? [])) });
}
