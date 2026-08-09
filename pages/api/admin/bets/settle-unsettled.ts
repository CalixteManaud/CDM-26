/**
 * POST /api/admin/bets/settle-unsettled
 *
 * Règle les paris restés en PENDING sur des matchs déjà TERMINÉS (settlement
 * jamais déclenché — ex. match clôturé sans passer par le formulaire de
 * résultat, ou settlement raté). Pour chaque match fini avec score et des paris
 * PENDING, on relance `settleMatchBets` (idempotent : ignore les pools déjà
 * réglés). Crédits Wizebot throttlés pour ne pas re-déclencher l'anti-spam.
 *
 * Admin uniquement.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { isSiteAdmin } from '@/lib/utils/permissions';
import prisma from '@/lib/prisma';
import { settleMatchBets, matchOutcomeFromScores } from '@/lib/utils/betting';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });
  if (!(await isSiteAdmin(dbUser.id))) return res.status(403).json({ error: 'Réservé aux administrateurs' });

  // Matchs terminés, avec score, qui ont encore des paris PENDING.
  const matches = await prisma.match.findMany({
    where: {
      status: 'FINISHED',
      homeScore: { not: null },
      awayScore: { not: null },
      bets: { some: { status: 'PENDING' } },
    },
    select: {
      id: true,
      homeScore: true,
      awayScore: true,
      homeTeam: { select: { shortName: true } },
      awayTeam: { select: { shortName: true } },
    },
  });

  const results: Array<{ match: string; settled: boolean; error?: string }> = [];
  let matchesSettled = 0;

  for (const m of matches) {
    const label = `${m.homeTeam.shortName} ${m.homeScore}-${m.awayScore} ${m.awayTeam.shortName}`;
    try {
      const outcome = matchOutcomeFromScores(m.homeScore as number, m.awayScore as number);
      await settleMatchBets({ matchId: m.id, outcome });
      matchesSettled++;
      results.push({ match: label, settled: true });
    } catch (err) {
      console.error('[settle-unsettled] échec', m.id, err);
      results.push({ match: label, settled: false, error: err instanceof Error ? err.message : 'inconnu' });
    }
  }

  return res.status(200).json({
    success: true,
    matchesFound: matches.length,
    matchesSettled,
    results,
  });
}
