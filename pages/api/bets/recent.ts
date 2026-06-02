import type { NextApiRequest, NextApiResponse } from 'next';
import { getRecentBetsFeed } from '@/actions/betting';

/**
 * Flux des dernières mises (1X2 + marchés flexibles), pour le polling live de
 * la page /paris. La route est protégée par le middleware Clerk (proxy.ts) au
 * même titre que /paris — la sortie est de toute façon anonymisée côté front.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const result = await getRecentBetsFeed(limit);

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  // Cache court côté CDN : absorbe les rafales de polling à fort trafic
  res.setHeader('Cache-Control', 'public, max-age=3, stale-while-revalidate=6');
  return res.status(200).json({ success: true, data: result.data });
}
