import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { syncClerkUserById } from '@/lib/clerk';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  // Vérifier que l'utilisateur est admin
  const adminUser = await syncClerkUserById(userId);

  if (!adminUser || adminUser.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  const { targetUserId, newRole } = req.body;

  if (!targetUserId || !newRole) {
    return res.status(400).json({ error: 'userId et newRole requis' });
  }

  // Valider le rôle
  const validRoles = ['GUEST', 'PARTICIPANT'];
  if (!validRoles.includes(newRole)) {
    return res.status(400).json({
      error: 'Rôle invalide. Utilisez GUEST ou PARTICIPANT'
    });
  }

  try {
    // Récupérer l'utilisateur cible
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, name: true },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Ne pas permettre de modifier le rôle d'un admin
    if (targetUser.role === 'ADMIN') {
      return res.status(403).json({
        error: 'Impossible de modifier le rôle d\'un administrateur'
      });
    }

    // Mettre à jour le rôle
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: { id: true, role: true, name: true },
    });

    return res.status(200).json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error changing user role:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
