import type { NextApiRequest, NextApiResponse } from 'next';
import { getTournamentStatistics } from '@/lib/utils/tournament-stats';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tournamentId = req.query.id as string;

    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID requis' });
    }

    const stats = await getTournamentStatistics(tournamentId);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: unknown) {
    console.error('Error fetching tournament statistics:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur serveur',
    });
  }
}
