/**
 * PATCH  /api/admin/teams/[id]  → met à jour une équipe (admin).
 * DELETE /api/admin/teams/[id]  → supprime une équipe (admin).
 *
 * Convention Pages Router : Prisma inline + guard getAuth → syncClerkUserById →
 * isSiteAdmin.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { isSiteAdmin } from '@/lib/utils/permissions';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  shortName: z.string().min(2).max(3).optional(),
  logo: z.string().url().optional().or(z.literal('')),
  tournamentId: z.string().uuid().optional(),
  groupId: z.string().uuid().nullable().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });
  if (!(await isSiteAdmin(dbUser.id))) return res.status(403).json({ error: 'Réservé aux administrateurs' });

  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id) return res.status(400).json({ error: 'id requis' });

  if (req.method === 'DELETE') {
    try {
      await prisma.team.delete({ where: { id } });
      return res.status(200).json({ success: true });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === 'P2025') return res.status(404).json({ error: 'Équipe introuvable' });
      if (e.code === 'P2003') {
        return res.status(409).json({
          error: "Impossible de supprimer : l'équipe a des données liées (joueurs, matchs, paris). Retire-les d'abord.",
        });
      }
      console.error('Error deleting team (admin):', error);
      return res.status(500).json({ error: "Erreur lors de la suppression de l'équipe" });
    }
  }

  // PATCH
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
    }
    const input = parsed.data;
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.shortName !== undefined) data.shortName = input.shortName;
    if (input.logo !== undefined) data.logo = input.logo || null;
    if (input.tournamentId !== undefined) data.tournamentId = input.tournamentId;
    if (input.groupId !== undefined) data.groupId = input.groupId;
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }

    const team = await prisma.team.update({ where: { id }, data, select: { id: true } });
    return res.status(200).json({ success: true, id: team.id });
  } catch (error: unknown) {
    const e = error as { code?: string; meta?: { target?: string[] } };
    if (e.code === 'P2025') return res.status(404).json({ error: 'Équipe introuvable' });
    if (e.code === 'P2002' && e.meta?.target?.includes('shortName')) {
      return res.status(400).json({ error: `Le nom court "${req.body?.shortName}" est déjà pris dans ce tournoi.` });
    }
    console.error('Error updating team (admin):', error);
    return res.status(500).json({ error: "Erreur lors de la mise à jour de l'équipe" });
  }
}
