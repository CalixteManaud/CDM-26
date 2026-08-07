/**
 * GET /api/invites/[token]/name-available?name=...
 * Vérif en direct de la disponibilité d'un nom d'équipe (par tournoi de
 * l'invitation, insensible à la casse). Réservé au destinataire de l'invitation.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { loadInviteForUser, isTeamNameTaken } from '@/lib/utils/team-invites';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });

  const token = typeof req.query.token === 'string' ? req.query.token : null;
  const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
  if (!token) return res.status(400).json({ error: 'Token requis' });

  const loaded = await loadInviteForUser(token, dbUser.id);
  if (!loaded.ok) return res.status(loaded.status).json({ error: loaded.error });

  if (name.length < 2) return res.status(200).json({ available: null });

  const taken = await isTeamNameTaken(loaded.invite.tournamentId, name);
  return res.status(200).json({ available: !taken });
}
