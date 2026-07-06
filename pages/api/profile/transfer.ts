/**
 * POST /api/profile/transfer
 *
 * Transfère des points de chaîne Wizebot du user connecté vers un autre user
 * CDM 26 (identifié par pseudo ou username Twitch).
 *
 * Flow : auth Clerk → twitchUsername requis → rate limit → transferPoints()
 * (débit expéditeur → crédit destinataire → rollback si échec).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { rateLimitTransfer } from '@/lib/rate-limit';
import {
  transferPoints,
  MIN_TRANSFER_POINTS,
  MAX_TRANSFER_POINTS,
} from '@/lib/utils/transfers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Auth
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });

  if (!dbUser.twitchUsername) {
    return res.status(400).json({
      error: 'Lie ton compte Twitch sur ton profil pour transférer des points.',
      code: 'NO_TWITCH_LINK',
    });
  }

  // 2. Rate limit : 5 transferts/min/user
  const rl = await rateLimitTransfer(dbUser.id);
  if (!rl.success) {
    res.setHeader('Retry-After', Math.ceil((rl.resetAt - Date.now()) / 1000));
    return res.status(429).json({
      error: 'Trop de transferts en peu de temps — patiente quelques secondes.',
      code: 'RATE_LIMITED',
    });
  }

  // 3. Body
  const body = (req.body ?? {}) as { recipient?: unknown; points?: unknown; note?: unknown };
  const recipient = typeof body.recipient === 'string' ? body.recipient : '';
  const points =
    typeof body.points === 'number' ? body.points : Number.parseInt(String(body.points ?? ''), 10);
  const note = typeof body.note === 'string' ? body.note : null;

  if (!recipient.trim()) {
    return res.status(400).json({ error: 'Destinataire requis', code: 'RECIPIENT_REQUIRED' });
  }
  if (!Number.isFinite(points) || !Number.isInteger(points) || points < MIN_TRANSFER_POINTS) {
    return res.status(400).json({ error: `Montant minimum : ${MIN_TRANSFER_POINTS} pt`, code: 'INVALID_AMOUNT' });
  }
  if (points > MAX_TRANSFER_POINTS) {
    return res.status(400).json({
      error: `Montant maximum par transfert : ${MAX_TRANSFER_POINTS.toLocaleString('fr-FR')} pts`,
      code: 'INVALID_AMOUNT',
    });
  }

  // 4. Transfert
  const result = await transferPoints({
    senderId: dbUser.id,
    senderTwitch: dbUser.twitchUsername,
    recipientQuery: recipient,
    amount: points,
    note,
  });

  if (!result.ok) {
    const status =
      result.code === 'RECIPIENT_NOT_FOUND'
        ? 404
        : result.code === 'INSIDER_BLOCKED'
          ? 403
          : result.code === 'INSUFFICIENT_FUNDS'
          ? 402
          : result.code === 'WIZEBOT_ERROR' ||
              result.code === 'CREDIT_FAILED_REFUNDED' ||
              result.code === 'CREDIT_FAILED_PENDING'
            ? 502
            : 400;
    return res.status(status).json({ error: result.error, code: result.code });
  }

  return res.status(200).json({
    success: true,
    transferId: result.transferId,
    amount: result.amount,
    recipient: result.recipient,
  });
}
