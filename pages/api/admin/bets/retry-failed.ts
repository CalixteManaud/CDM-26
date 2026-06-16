/**
 * /api/admin/bets/retry-failed
 *
 * Rejoue les paris dont le crédit Wizebot a échoué (status CREDIT_FAILED).
 *
 * Deux modes d'accès :
 *  - POST + admin authentifié (Clerk) : déclenchement manuel depuis l'admin UI
 *  - GET  + `Authorization: Bearer <CRON_SECRET>` : déclenchement automatique
 *    par Vercel Cron (voir vercel.json — toutes les 5 min).
 *
 * Si `CRON_SECRET` n'est pas défini en prod, les GET sont rejetés (sécurité).
 * En dev (NODE_ENV !== 'production'), GET sans secret est autorisé pour faciliter
 * les tests locaux.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'crypto';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserFromReq } from '@/lib/clerk';
import { retryFailedCredits, processPendingRefunds } from '@/lib/utils/betting';

/** Comparaison en temps constant (évite un timing oracle sur le secret). */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function isAuthorizedCron(req: NextApiRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const header = req.headers.authorization;
  if (!header) return false;
  return safeEqual(header, `Bearer ${secret}`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    if (!isAuthorizedCron(req)) {
      return res.status(401).json({ error: 'Unauthorized cron' });
    }
    try {
      const result = await retryFailedCredits();
      const refunds = await processPendingRefunds();
      return res.status(200).json({ success: true, source: 'cron', ...result, refunds });
    } catch (err) {
      console.error('[cron/retry-failed]', err);
      return res
        .status(500)
        .json({ error: err instanceof Error ? err.message : 'Erreur serveur' });
    }
  }

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
    const refunds = await processPendingRefunds();
    return res.status(200).json({ success: true, source: 'admin', ...result, refunds });
  } catch (err) {
    console.error('[admin/bets/retry-failed]', err);
    return res
      .status(500)
      .json({ error: err instanceof Error ? err.message : 'Erreur serveur' });
  }
}
