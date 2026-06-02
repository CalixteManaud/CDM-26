import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { isSiteAdmin } from '@/lib/utils/permissions';
import prisma from '@/lib/prisma';
import type { Prisma } from '@/prisma/prisma-client/client';

const SORTABLE = new Set(['name', 'role', 'createdAt']);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur non trouvé' });
  if (!(await isSiteAdmin(dbUser.id))) return res.status(403).json({ error: 'Permissions insuffisantes' });

  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 10, 1), 100);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const sortBy = SORTABLE.has(String(req.query.sortBy)) ? (req.query.sortBy as string) : 'createdAt';
  const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';

  const where: Prisma.UserWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  try {
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
          createdAt: true,
          coachedTeams: {
            select: { id: true, name: true, tournament: { select: { name: true } } },
          },
        },
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return res.status(200).json({ success: true, rows, total });
  } catch (error) {
    console.error('Error listing users:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
}
