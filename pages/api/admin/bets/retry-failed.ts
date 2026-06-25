/**
 * /api/admin/bets/retry-failed
 *
 * Rejoue les paris dont le crédit Wizebot a échoué (status CREDIT_FAILED) ET
 * les remboursements en attente (débits orphelins).
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
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserFromReq } from '@/lib/clerk';
import { retryFailedCredits, processPendingRefunds } from '@/lib/utils/betting';
import { safeEqual } from '@/lib/utils/safe-equal';

function isAuthorizedCron(req: NextApiRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const header = req.headers.authorization;
  if (!header) return false;
  return safeEqual(header, `Bearer ${secret}`);
}

/**
 * Lance les deux passes (crédits ratés + remboursements) en parallèle et de
 * manière INDÉPENDANTE : un échec de l'une (ex: table absente, Wizebot down)
 * ne doit pas effacer le résultat de l'autre. On renvoie toujours 200 avec le
 * détail par passe.
 */
async function runRetries() {
  const [credits, refunds] = await Promise.allSettled([
    retryFailedCredits(),
    processPendingRefunds(),
  ]);
  return {
    credits:
      credits.status === 'fulfilled'
        ? credits.value
        : { error: credits.reason instanceof Error ? credits.reason.message : 'failed' },
    refunds:
      refunds.status === 'fulfilled'
        ? refunds.value
        : { error: refunds.reason instanceof Error ? refunds.reason.message : 'failed' },
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    if (!isAuthorizedCron(req)) {
      return res.status(401).json({ error: 'Unauthorized cron' });
    }
    const result = await runRetries();
    return res.status(200).json({ success: true, source: 'cron', ...result });
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

  const result = await runRetries();
  return res.status(200).json({ success: true, source: 'admin', ...result });
}
