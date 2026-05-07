'use server';

import { getTournamentStatistics } from '@/lib/utils/tournament-stats';

export async function getTournamentStats(tournamentId: string) {
  try {
    const stats = await getTournamentStatistics(tournamentId);
    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching tournament statistics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la récupération des statistiques',
    };
  }
}
