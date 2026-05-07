import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  const webhookId = req.query.id as string;

  if (!webhookId) {
    return res.status(400).json({ error: 'ID du webhook requis' });
  }

  // Récupérer l'utilisateur depuis la base de données
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  // Vérifier que le webhook appartient à l'utilisateur
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId },
  });

  if (!webhook) {
    return res.status(404).json({ error: 'Webhook non trouvé' });
  }

  if (webhook.userId !== user.id) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  // PUT/PATCH - Mettre à jour un webhook
  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const { name, url, secret, events, tournamentId, teamId, isActive } =
        req.body;

      // Valider les événements si fournis
      if (events) {
        const validEvents = [
          'MATCH_STARTED',
          'MATCH_FINISHED',
          'SCORE_UPDATED',
          'STANDINGS_UPDATED',
          'BRACKET_UPDATED',
        ];
        const invalidEvents = events.filter(
          (e: string) => !validEvents.includes(e)
        );
        if (invalidEvents.length > 0) {
          return res.status(400).json({
            error: `Événements invalides: ${invalidEvents.join(', ')}`,
          });
        }
      }

      const updatedWebhook = await prisma.webhook.update({
        where: { id: webhookId },
        data: {
          ...(name !== undefined && { name }),
          ...(url !== undefined && { url }),
          ...(secret !== undefined && { secret: secret || null }),
          ...(events !== undefined && { events }),
          ...(tournamentId !== undefined && { tournamentId: tournamentId || null }),
          ...(teamId !== undefined && { teamId: teamId || null }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      return res.status(200).json({ webhook: updatedWebhook });
    } catch (error) {
      console.error('Error updating webhook:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // DELETE - Supprimer un webhook
  if (req.method === 'DELETE') {
    try {
      await prisma.webhook.delete({
        where: { id: webhookId },
      });

      return res.status(200).json({ message: 'Webhook supprimé avec succès' });
    } catch (error) {
      console.error('Error deleting webhook:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
