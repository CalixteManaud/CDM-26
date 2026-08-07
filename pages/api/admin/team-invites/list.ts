/**
 * GET /api/admin/team-invites/list?page&pageSize&search&sortBy&sortDir
 * Admin : suivi des invitations. Format { rows, total } pour AdminDataTable.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { isSiteAdmin } from '@/lib/utils/permissions';
import prisma from '@/lib/prisma';
import type { Prisma } from '@/prisma/prisma-client/client';
import { expireStaleInvites } from '@/lib/utils/team-invites';

const SORTABLE = new Set(['createdAt', 'status', 'expiresAt']);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });
  if (!(await isSiteAdmin(dbUser.id))) return res.status(403).json({ error: 'Réservé aux administrateurs' });

  await expireStaleInvites();

  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 10, 1), 100);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const sortBy = SORTABLE.has(String(req.query.sortBy)) ? (req.query.sortBy as string) : 'createdAt';
  const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';

  const where: Prisma.TeamCreationInviteWhereInput = search
    ? {
        OR: [
          { targetUser: { name: { contains: search, mode: 'insensitive' } } },
          { targetUser: { username: { contains: search, mode: 'insensitive' } } },
          { targetUser: { email: { contains: search, mode: 'insensitive' } } },
          { tournament: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }
    : {};

  try {
    const [rows, total] = await Promise.all([
      prisma.teamCreationInvite.findMany({
        where,
        select: {
          id: true,
          status: true,
          createdAt: true,
          expiresAt: true,
          clickedAt: true,
          respondedAt: true,
          targetUser: { select: { id: true, name: true, username: true, email: true } },
          tournament: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.teamCreationInvite.count({ where }),
    ]);
    return res.status(200).json({ rows, total });
  } catch (error) {
    console.error('[team-invites/list]', error);
    return res.status(500).json({ error: 'Erreur lors du chargement des invitations' });
  }
}
