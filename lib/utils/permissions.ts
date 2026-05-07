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
