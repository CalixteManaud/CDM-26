import { UserRole } from "../../prisma/prisma-client/client";
import prisma from "../prisma";

/**
 * Permission utility functions for role-based access control
 */

/**
 * Check if a user is a site admin (can manage everything)
 */
export async function isSiteAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === "ADMIN";
}

/**
 * Check if a user is the coach/admin of a specific team
 */
export async function isTeamCoach(userId: string, teamId: string): Promise<boolean> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { coachUserId: true },
  });

  return team?.coachUserId === userId;
}

/**
 * Check if a user can manage a specific team
 * (Either site admin OR team coach)
 */
export async function canManageTeam(userId: string, teamId: string): Promise<boolean> {
  const [admin, coach] = await Promise.all([
    isSiteAdmin(userId),
    isTeamCoach(userId, teamId),
  ]);

  return admin || coach;
}

/**
 * Check if a user can create tournaments
 * (Only site admins)
 */
export async function canCreateTournament(userId: string): Promise<boolean> {
  return isSiteAdmin(userId);
}

/**
 * Check if a user can manage matches for a specific match
 * (Site admin OR coach of either team in the match)
 */
export async function canManageMatch(userId: string, matchId: string): Promise<boolean> {
  const admin = await isSiteAdmin(userId);
  if (admin) return true;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      homeTeam: { select: { coachUserId: true } },
      awayTeam: { select: { coachUserId: true } },
    },
  });

  if (!match) return false;

  return (
    match.homeTeam.coachUserId === userId ||
    match.awayTeam.coachUserId === userId
  );
}

/**
 * Get user role by clerk ID
 */
export async function getUserRole(clerkId: string): Promise<UserRole | null> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true },
  });

  return user?.role ?? null;
}

/**
 * Get user role by user ID
 */
export async function getUserRoleById(userId: string): Promise<UserRole | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role ?? null;
}

/**
 * Check if a user can upgrade from GUEST to PARTICIPANT
 * (Always allowed for GUEST users)
 */
export async function canUpgradeToParticipant(userId: string): Promise<boolean> {
  const role = await getUserRoleById(userId);
  return role === "GUEST";
}

/**
 * Get teams coached by a user
 */
export async function getCoachedTeams(userId: string) {
  return prisma.team.findMany({
    where: { coachUserId: userId },
    include: {
      tournament: true,
      group: true,
      players: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}

/**
 * Count total site admins
 */
export async function countSiteAdmins(): Promise<number> {
  return prisma.user.count({
    where: { role: "ADMIN" },
  });
}

/**
 * Check if we can add more site admins
 * (Limit to 5 site admins)
 */
export async function canAddSiteAdmin(): Promise<boolean> {
  const count = await countSiteAdmins();
  return count < 5; // Max 5 site admins
}

/**
 * Détermine si un user peut placer un pari sur un tournoi donné.
 *
 * Bloqué pour :
 *  - PLAYER inscrit dans une équipe de ce tournoi (info privilégiée)
 *  - COACH d'une équipe de ce tournoi (info privilégiée)
 *
 * Les ADMIN peuvent parier (les paris sont en pari mutuel — pas de conflit
 * d'intérêt direct, et la maison ne joue pas contre les parieurs).
 *
 * Retourne `{ ok: true }` si autorisé, sinon `{ ok: false, reason }` avec un code
 * explicite que l'API route peut traduire en message FR.
 */
export type BetRefusal = 'PLAYER' | 'COACH';

export async function canUserBetOnTournament(
  userId: string,
  tournamentId: string
): Promise<{ ok: true } | { ok: false; reason: BetRefusal }> {
  // Les admins sont exemptés : ils deviennent coach "par défaut" des équipes
  // qu'ils créent, avant l'affectation des vrais coachs. Cohérent avec
  // l'exemption admin sur les transferts (isActiveTournamentInsider).
  if (await isSiteAdmin(userId)) return { ok: true };

  const [isPlayer, isCoach] = await Promise.all([
    prisma.player.findFirst({
      where: { userId, team: { tournamentId } },
      select: { id: true },
    }),
    prisma.team.findFirst({
      where: { tournamentId, coachUserId: userId },
      select: { id: true },
    }),
  ]);

  if (isPlayer) return { ok: false, reason: 'PLAYER' };
  if (isCoach) return { ok: false, reason: 'COACH' };
  return { ok: true };
}

/**
 * Variante "par match" — résout d'abord le tournamentId.
 */
export async function canUserBetOnMatch(
  userId: string,
  matchId: string
): Promise<{ ok: true } | { ok: false; reason: BetRefusal | 'NOT_FOUND' }> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { tournamentId: true },
  });
  if (!match) return { ok: false, reason: 'NOT_FOUND' };
  return canUserBetOnTournament(userId, match.tournamentId);
}

/**
 * Variante "par marché" — gère à la fois les marchés liés à un match
 * (score exact, total buts, BTTS) et les marchés tournoi-wide (vainqueur,
 * top buteur, MVP).
 */
export async function canUserBetOnMarket(
  userId: string,
  marketId: string
): Promise<{ ok: true } | { ok: false; reason: BetRefusal | 'NOT_FOUND' }> {
  const market = await prisma.bettingMarket.findUnique({
    where: { id: marketId },
    select: {
      tournamentId: true,
      match: { select: { tournamentId: true } },
    },
  });
  if (!market) return { ok: false, reason: 'NOT_FOUND' };
  const tournamentId = market.tournamentId ?? market.match?.tournamentId;
  if (!tournamentId) return { ok: false, reason: 'NOT_FOUND' };
  return canUserBetOnTournament(userId, tournamentId);
}

/**
 * Vrai si l'user est joueur inscrit OU coach d'une équipe dans un tournoi encore
 * actif (non archivé). Utilisé pour bloquer les transferts de points d'un
 * "initié" vers un prête-nom qui parierait à sa place (intégrité des paris).
 */
export async function isActiveTournamentInsider(userId: string): Promise<boolean> {
  const [player, coach] = await Promise.all([
    prisma.player.findFirst({
      where: { userId, team: { tournament: { archivedAt: null } } },
      select: { id: true },
    }),
    prisma.team.findFirst({
      where: { coachUserId: userId, tournament: { archivedAt: null } },
      select: { id: true },
    }),
  ]);
  return !!(player || coach);
}

/**
 * Helper pour produire un message FR lisible à partir d'un refus.
 */
export function betRefusalMessage(reason: BetRefusal): string {
  switch (reason) {
    case 'PLAYER':
      return "Les joueurs inscrits dans le tournoi ne peuvent pas parier sur leurs propres compétitions.";
    case 'COACH':
      return "Les coachs ne peuvent pas parier sur le tournoi de leur équipe.";
  }
}
