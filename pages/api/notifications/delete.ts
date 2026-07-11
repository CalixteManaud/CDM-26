/**
 * POST /api/notifications/delete
 *
 * Supprime des notifications du user. Body :
 *  - { id: string }  → une seule
 *  - { all: true }   → toutes celles du user
 *
 * Le `userId` en garde empêche de supprimer les notifs d'un autre utilisateur.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });

  const body = (req.body ?? {}) as { id?: unknown; all?: unknown };

  if (body.all === true) {
    await prisma.notification.deleteMany({ where: { userId: dbUser.id } });
    return res.status(200).json({ success: true });
  }

  if (typeof body.id === 'string') {
    // deleteMany avec le userId en garde → un user ne peut pas supprimer les notifs d'un autre.
    await prisma.notification.deleteMany({
      where: { id: body.id, userId: dbUser.id },
    });
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'id ou all requis' });
}
