/**
 * POST /api/tournaments/[id]/reset-group-stage
 *
 * Supprime tous les matchs de la phase de poules d'un tournoi pour permettre de
 * relancer le tirage au sort (verrouillé tant que des matchs GROUP existent).
 *
 * Garde-fous (réinitialisation refusée si) :
 *  - un match de poule a déjà un résultat (FINISHED) ;
 *  - des paris ACTIFS (PENDING) sont en cours sur ces matchs (mises engagées).
 *
 * Les paris CANCELED / VOID ont déjà été remboursés : ils n'empêchent pas la
 * réinitialisation, mais comme `Bet.match` et `MarketBet.market` sont en
 * onDelete: Restrict, on doit les supprimer explicitement dans la transaction
 * avant de supprimer les matchs.
 *
 * Suppression : les marchés / pools / events / stats des matchs cascadent au
 * niveau DB. On efface aussi les standings (dérivés) et on remet
 * `groupStageComplete` à false pour repartir propre.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { isSiteAdmin } from '@/lib/utils/permissions';
import prisma from '@/lib/prisma';

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

  const tournamentId = req.query.id as string;
  if (!tournamentId) return res.status(400).json({ error: 'Tournoi requis' });

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, archivedAt: true },
  });
  if (!tournament) return res.status(404).json({ error: 'Tournoi introuvable' });
  if (tournament.archivedAt) {
    return res.status(400).json({ error: 'Tournoi archivé — désarchive-le d’abord' });
  }

  const groupMatches = await prisma.match.findMany({
    where: { tournamentId, stage: 'GROUP' },
    select: { id: true, status: true },
  });
  if (groupMatches.length === 0) {
    return res.status(400).json({ error: 'Aucun match de poule à réinitialiser.' });
  }

  const finished = groupMatches.filter((m) => m.status === 'FINISHED').length;
  if (finished > 0) {
    return res.status(409).json({
      error: `Réinitialisation impossible : ${finished} match${finished > 1 ? 's' : ''} de poule ${finished > 1 ? 'ont' : 'a'} déjà un résultat. Annule les résultats d’abord.`,
    });
  }

  // On ne bloque que sur les paris ACTIFS (PENDING) : leurs mises sont encore
  // engagées dans le pool et seraient perdues si on supprimait le match. Les
  // paris CANCELED / VOID ont déjà été remboursés et retirés du pool, donc ils
  // ne posent aucun problème pour la réinitialisation.
  const matchIds = groupMatches.map((m) => m.id);
  const [betCount, marketBetCount] = await Promise.all([
    prisma.bet.count({ where: { matchId: { in: matchIds }, status: 'PENDING' } }),
    prisma.marketBet.count({
      where: { market: { matchId: { in: matchIds } }, status: 'PENDING' },
    }),
  ]);
  const totalBets = betCount + marketBetCount;
  if (totalBets > 0) {
    return res.status(409).json({
      error: `Réinitialisation impossible : ${totalBets} pari${totalBets > 1 ? 's actifs sont' : ' actif est'} en cours sur ces matchs — annule-les d’abord (les mises seront remboursées).`,
    });
  }

  try {
    const matchesDeleted = await prisma.$transaction(async (tx) => {
      await tx.standing.deleteMany({ where: { tournamentId } });
      // Retire les paris déjà remboursés/settled (CANCELED / VOID) référençant
      // ces matchs : leurs FK sont en onDelete: Restrict et bloqueraient sinon
      // la suppression des matchs (et des marchés cascadés).
      await tx.marketBet.deleteMany({ where: { market: { matchId: { in: matchIds } } } });
      await tx.bet.deleteMany({ where: { matchId: { in: matchIds } } });
      const del = await tx.match.deleteMany({ where: { tournamentId, stage: 'GROUP' } });
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { groupStageComplete: false },
      });
      return del.count;
    });

    return res.status(200).json({ success: true, matchesDeleted });
  } catch (error) {
    console.error('Error resetting group stage:', error);
    return res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
}
