/**
 * GET /api/notifications
 *
 * Liste les notifications du user connecté (les 30 plus récentes) + le nombre
 * de non-lues. Utilisé par la cloche du header (polling léger).
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

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, type: true, title: true, body: true, href: true, read: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: dbUser.id, read: false } }),
  ]);

  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({ notifications: items, unread });
}
