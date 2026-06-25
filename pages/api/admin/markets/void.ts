/**
 * POST /api/admin/markets/void
 *
 * Annule un marché flexible : rembourse les paris simples et neutralise les
 * jambes de combiné (le combiné est recalculé sans cette jambe).
 * Body: { marketId: string }
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

  const body = (req.body ?? {}) as { marketId?: string };
  if (!body.marketId || typeof body.marketId !== 'string') {
    return res.status(400).json({ error: 'marketId requis' });
  }

  const { voidMarket } = await import('@/actions/markets');
  const result = await voidMarket({ marketId: body.marketId });
  if (!result.success) return res.status(400).json({ error: result.error });

  return res.status(200).json({ success: true, ...result.data });
}
