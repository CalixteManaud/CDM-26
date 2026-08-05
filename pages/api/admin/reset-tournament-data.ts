/**
 * POST /api/admin/reset-tournament-data
 *
 * Vide toute la donnée de tournoi/paris pour repartir de zéro, **en conservant
 * la table User** (rôles, liens Twitch, comptes Clerk). Le rôle n'est jamais
 * relu depuis Clerk (sync DB → Clerk uniquement, cf. lib/clerk.ts) : supprimer
 * les users ferait perdre les ADMIN et verrouillerait l'accès. On ne les touche
 * donc pas.
 *
 * Sécurité : admin uniquement + jeton de confirmation `{ confirm: "RESET" }`.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { isOwnerEmail } from '@/lib/utils/permissions';
import prisma from '@/lib/prisma';

// Toutes les tables SAUF "User" (et les tables système _prisma_migrations).
// Ordre indifférent : CASCADE gère les dépendances de clés étrangères.
const TABLES = [
  'MatchEvent',
  'BetSlip',
  'MarketBet',
  'MarketPool',
  'BettingMarket',
  'Bet',
  'MatchBettingPool',
  'Standing',
  'MatchPlayerStats',
  'Match',
  'TeamJoinRequest',
  'Player',
  'Team',
  'Group',
  'Tournament',
  'Notification',
  'PointTransfer',
  'PendingRefund',
] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });
  // Réservé au PROPRIÉTAIRE (pas aux autres admins) — action ultra-destructive.
  if (!isOwnerEmail(dbUser.email)) {
    return res.status(403).json({ error: 'Action réservée au propriétaire du site', code: 'OWNER_ONLY' });
  }

  if (req.body?.confirm !== 'RESET') {
    return res.status(400).json({ error: 'Confirmation requise', code: 'CONFIRM_REQUIRED' });
  }

  try {
    // Compteurs avant (pour le retour lisible).
    const [tournaments, teams, players, matches, bets, marketBets, slips, users] = await Promise.all([
      prisma.tournament.count(),
      prisma.team.count(),
      prisma.player.count(),
      prisma.match.count(),
      prisma.bet.count(),
      prisma.marketBet.count(),
      prisma.betSlip.count(),
      prisma.user.count(),
    ]);

    // Un seul TRUNCATE multi-tables (transactionnel côté Postgres). Liste 100 %
    // constante — aucune interpolation d'entrée utilisateur.
    const list = TABLES.map((t) => `"${t}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);

    console.warn(`[admin/reset] Données de tournoi vidées par ${dbUser.id} (${dbUser.email}).`);

    return res.status(200).json({
      success: true,
      wiped: { tournaments, teams, players, matches, bets, marketBets, slips },
      preserved: { users },
    });
  } catch (error) {
    console.error('[admin/reset] Erreur lors du reset:', error);
    return res.status(500).json({ error: 'Erreur lors de la réinitialisation des données' });
  }
}
