/**
 * GET /api/profile/transfers
 *
 * Historique des transferts de points du user connecté (envoyés + reçus),
 * les 40 plus récents. Sert l'affichage « Mes transferts » sur le profil.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });

  const rows = await prisma.pointTransfer.findMany({
    where: { OR: [{ senderId: dbUser.id }, { recipientId: dbUser.id }] },
    orderBy: { createdAt: 'desc' },
    take: 40,
    select: {
      id: true,
      amount: true,
      note: true,
      status: true,
      createdAt: true,
      senderId: true,
      recipientId: true,
      sender: { select: { username: true, twitchUsername: true } },
      recipient: { select: { username: true, twitchUsername: true } },
    },
  });

  const transfers = rows.map((t) => {
    const outgoing = t.senderId === dbUser.id;
    const other = outgoing ? t.recipient : t.sender;
    return {
      id: t.id,
      direction: outgoing ? 'out' : 'in',
      amount: t.amount,
      note: t.note,
      status: t.status,
      createdAt: t.createdAt,
      counterparty: other.username ?? other.twitchUsername ?? '—',
    };
  });

  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({ transfers });
}
