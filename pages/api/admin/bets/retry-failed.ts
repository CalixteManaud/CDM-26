/**
 * POST /api/admin/bets/retry-failed
 *
 * Rejoue les paris dont le crédit Wizebot a échoué (status CREDIT_FAILED).
 * Réservé aux admins.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserFromReq } from '@/lib/clerk';
import { retryFailedCredits } from '@/lib/utils/betting';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const dbUser = await syncClerkUserFromReq(req);
  if (!dbUser || dbUser.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin requis' });
  }

  try {
    const result = await retryFailedCredits();
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error('[admin/bets/retry-failed]', err);
    return res
      .status(500)
      .json({ error: err instanceof Error ? err.message : 'Erreur serveur' });
  }
}
