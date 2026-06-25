/**
 * POST /api/admin/markets/generate-standard
 *
 * Génère les marchés de paris standard (score exact, +/- buts, BTTS, draw no
 * bet, pair/impair) pour un match précis OU tous les matchs d'un tournoi.
 * Idempotent (ne recrée pas un marché déjà présent).
 * Body: { matchId?: string, tournamentId?: string }
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

  const body = (req.body ?? {}) as { matchId?: string; tournamentId?: string };
  if (!body.matchId && !body.tournamentId) {
    return res.status(400).json({ error: 'matchId ou tournamentId requis' });
  }

  const { createStandardMatchMarkets, ensureStandardMarketsForTournament } = await import(
    '@/actions/markets'
  );

  if (body.matchId) {
    const match = await prisma.match.findUnique({
      where: { id: body.matchId },
      select: { matchDate: true },
    });
    if (!match) return res.status(404).json({ error: 'Match introuvable' });
    const result = await createStandardMatchMarkets(body.matchId, new Date(match.matchDate));
    if (!result.success) return res.status(500).json({ error: result.error });
    return res.status(200).json({ success: true, ...result.data });
  }

  const result = await ensureStandardMarketsForTournament(body.tournamentId!);
  if (!result.success) return res.status(500).json({ error: result.error });
  return res.status(200).json({ success: true, ...result.data });
}
