/**
 * POST /api/admin/markets/settle
 *
 * Verrouille puis règle un marché. Crédit Wizebot des gagnants.
 * Body: { marketId: string, winningOutcomeKey: string }
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

  const body = (req.body ?? {}) as { marketId?: string; winningOutcomeKey?: string };
  if (!body.marketId || !body.winningOutcomeKey) {
    return res
      .status(400)
      .json({ error: 'marketId et winningOutcomeKey requis' });
  }

  const { lockMarket, settleMarket } = await import('@/actions/markets');

  const lockRes = await lockMarket(body.marketId);
  if (!lockRes.success) return res.status(500).json({ error: lockRes.error });

  const settleRes = await settleMarket({
    marketId: body.marketId,
    winningOutcomeKey: body.winningOutcomeKey,
  });
  if (!settleRes.success) return res.status(500).json({ error: settleRes.error });

  return res.status(200).json({ success: true, settled: settleRes.data });
}
