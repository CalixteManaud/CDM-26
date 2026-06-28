/**
 * GET /api/bets/mine?matchId=<id>
 *
 * Renvoie les paris 1X2 PENDING de l'user courant sur un match, avec l'instant
 * d'expiration de leur fenêtre d'édition (3 min). Sert à la liste "mes paris
 * modifiables" dans le dialog de pari (/paris).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import prisma from '@/lib/prisma';
import { BetStatus } from '@/prisma/prisma-client/enums';
import { BET_EDIT_WINDOW_MS } from '@/lib/utils/odds';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });

  const matchId = typeof req.query.matchId === 'string' ? req.query.matchId : null;
  if (!matchId) return res.status(400).json({ error: 'matchId requis' });

  const bets = await prisma.bet.findMany({
    where: { userId: dbUser.id, matchId, status: BetStatus.PENDING },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      outcome: true,
      pointsWagered: true,
      oddsAtPlacement: true,
      createdAt: true,
    },
  });

  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({
    editWindowMs: BET_EDIT_WINDOW_MS,
    bets: bets.map((b) => ({
      id: b.id,
      outcome: b.outcome,
      pointsWagered: b.pointsWagered,
      oddsAtPlacement: Number(b.oddsAtPlacement),
      createdAt: b.createdAt.toISOString(),
      editableUntil: new Date(b.createdAt.getTime() + BET_EDIT_WINDOW_MS).toISOString(),
    })),
  });
}
