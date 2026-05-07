'use server';

import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';
import { syncClerkUser } from '@/lib/clerk';
import { generateGroupMatches } from '@/lib/utils/group-match-generator';
import { generateKnockoutBracket } from '@/lib/utils/bracket-generator';

/**
 * Génère tous les matchs de groupe (round-robin) pour un tournoi
 * Action Admin uniquement
 */
export async function generateGroupMatchesAction(tournamentId: string) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const dbUser = await syncClerkUser();
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return { success: false, error: 'Permissions insuffisantes - Admin requis' };
    }

    const result = await generateGroupMatches(tournamentId);

    revalidatePath(`/tournaments/${tournamentId}`);
    revalidatePath('/matches');

    return {
      success: true,
      data: {
        matchesCreated: result.matchesCreated,
        groups: result.groups,
        message: `${result.matchesCreated} matchs de groupe créés avec succès pour ${result.groups} groupes`,
      },
    };
  } catch (error: any) {
    console.error('Error generating group matches:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la génération des matchs de groupe',
    };
  }
}

/**
 * Génère le bracket d'élimination après la phase de groupes
 * Action Admin uniquement
 */
export async function generateKnockoutBracketAction(tournamentId: string) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const dbUser = await syncClerkUser();
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return { success: false, error: 'Permissions insuffisantes - Admin requis' };
    }

    const result = await generateKnockoutBracket(tournamentId);

    revalidatePath(`/tournaments/${tournamentId}`);
    revalidatePath('/matches');

    return {
      success: true,
      data: {
        stage: result.stage,
        matchesCreated: result.matchesCreated,
        qualifiedTeams: result.qualifiedTeams,
        message: `Bracket d'élimination créé: ${result.matchesCreated} matchs en ${result.stage}`,
      },
    };
  } catch (error: any) {
    console.error('Error generating knockout bracket:', error);
    return {
      success: false,
      error: error.message || "Erreur lors de la génération du bracket d'élimination",
    };
  }
}
