import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { getWizebotBalance } from '@/lib/wizebot';

/**
 * GET /api/profile/balance
 *
 * Retourne le solde de points de chaîne Wizebot du user connecté.
 * Nécessite un twitchUsername lié.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const dbUser = await syncClerkUserById(userId);
    if (!dbUser) {
      return res.status(401).json({ error: 'Utilisateur introuvable' });
    }

    if (!dbUser.twitchUsername) {
      return res.status(400).json({ error: 'Compte Twitch non lié' });
    }

    const result = await getWizebotBalance(dbUser.twitchUsername);

    if (!result.ok) {
      return res.status(502).json({ error: result.error });
    }

    return res.status(200).json({ balance: result.balance });
  } catch (error) {
    console.error('Error fetching Wizebot balance:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur serveur',
    });
  }
}
