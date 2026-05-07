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

  // GET - Liste des webhooks de l'utilisateur
  if (req.method === 'GET') {
    try {
      // Récupérer l'utilisateur depuis la base de données
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      const webhooks = await prisma.webhook.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json({ webhooks });
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // POST - Créer un nouveau webhook
  if (req.method === 'POST') {
    try {
      const { name, url, secret, events, tournamentId, teamId } = req.body;

      if (!name || !url || !events || events.length === 0) {
        return res.status(400).json({
          error: 'Nom, URL et événements sont requis',
        });
      }

      // Valider les événements
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

      // Récupérer l'utilisateur depuis la base de données
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      const webhook = await prisma.webhook.create({
        data: {
          userId: user.id,
          name,
          url,
          secret: secret || null,
          events,
          tournamentId: tournamentId || null,
          teamId: teamId || null,
        },
      });

      return res.status(201).json({ webhook });
    } catch (error) {
      console.error('Error creating webhook:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
