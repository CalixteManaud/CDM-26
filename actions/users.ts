"use server";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import {
  isSiteAdmin,
  canUpgradeToParticipant,
  canAddSiteAdmin
} from "@/lib/utils/permissions";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Get current user from database (synced from Clerk)
 * For Server Actions (client-side calls)
 */
async function getCurrentDbUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  return prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
  });
}

/**
 * Upgrade user from GUEST to PARTICIPANT
 */
export async function upgradeToParticipant(): Promise<ActionResult<{ role: string }>> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) {
    return { success: false, error: "Non authentifié" };
  }

  const canUpgrade = await canUpgradeToParticipant(dbUser.id);
  if (!canUpgrade) {
    return { success: false, error: "Vous ne pouvez pas effectuer cette mise à niveau" };
  }

  try {
    const updated = await prisma.user.update({
      where: { id: dbUser.id },
      data: { role: "PARTICIPANT" },
    });

    revalidatePath("/");

    return {
      success: true,
      data: { role: updated.role },
    };
  } catch (error) {
    console.error("Error upgrading user:", error);
    return { success: false, error: "Erreur lors de la mise à niveau" };
  }
}

/**
 * Admin: Upgrade user to ADMIN role (limited to 5 site admins)
 */
export async function promoteToAdmin(targetUserId: string): Promise<ActionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) {
    return { success: false, error: "Non authentifié" };
  }

  const admin = await isSiteAdmin(dbUser.id);
  if (!admin) {
    return { success: false, error: "Permissions insuffisantes" };
  }

  const canAdd = await canAddSiteAdmin();
  if (!canAdd) {
    return { success: false, error: "Limite d'administrateurs atteinte (max 5)" };
  }

  try {
    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: "ADMIN" },
    });

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error promoting user:", error);
    return { success: false, error: "Erreur lors de la promotion" };
  }
}

/**
 * Admin: Downgrade user from ADMIN to PARTICIPANT
 */
export async function demoteFromAdmin(targetUserId: string): Promise<ActionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) {
    return { success: false, error: "Non authentifié" };
  }

  const admin = await isSiteAdmin(dbUser.id);
  if (!admin) {
    return { success: false, error: "Permissions insuffisantes" };
  }

  if (dbUser.id === targetUserId) {
    return { success: false, error: "Vous ne pouvez pas vous rétrograder vous-même" };
  }

  try {
    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: "PARTICIPANT" },
    });

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error demoting user:", error);
    return { success: false, error: "Erreur lors de la rétrogradation" };
  }
}

/**
 * Admin: Assign a coach to a team
 */
export async function assignTeamCoach(
  teamId: string,
  coachUserId: string
): Promise<ActionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) {
    return { success: false, error: "Non authentifié" };
  }

  const admin = await isSiteAdmin(dbUser.id);
  if (!admin) {
    return { success: false, error: "Seuls les administrateurs peuvent assigner des coachs" };
  }

  try {
    const coach = await prisma.user.findUnique({
      where: { id: coachUserId },
    });

    if (!coach) {
      return { success: false, error: "Utilisateur introuvable" };
    }

    // Ensure the coach is at least a PARTICIPANT
    if (coach.role === "GUEST") {
      await prisma.user.update({
        where: { id: coachUserId },
        data: { role: "PARTICIPANT" },
      });
    }

    await prisma.team.update({
      where: { id: teamId },
      data: { coachUserId },
    });

    revalidatePath(`/teams/${teamId}`);

    return { success: true };
  } catch (error) {
    console.error("Error assigning coach:", error);
    return { success: false, error: "Erreur lors de l'assignation du coach" };
  }
}

/**
 * Admin: Remove coach from a team
 */
export async function removeTeamCoach(teamId: string): Promise<ActionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) {
    return { success: false, error: "Non authentifié" };
  }

  const admin = await isSiteAdmin(dbUser.id);
  if (!admin) {
    return { success: false, error: "Seuls les administrateurs peuvent retirer des coachs" };
  }

  try {
    await prisma.team.update({
      where: { id: teamId },
      data: { coachUserId: null },
    });

    revalidatePath(`/teams/${teamId}`);

    return { success: true };
  } catch (error) {
    console.error("Error removing coach:", error);
    return { success: false, error: "Erreur lors du retrait du coach" };
  }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) {
    return { success: false, error: "Non authentifié" };
  }

  const admin = await isSiteAdmin(dbUser.id);
  if (!admin) {
    return { success: false, error: "Permissions insuffisantes" };
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        coachedTeams: {
          select: {
            id: true,
            name: true,
            tournament: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: users };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, error: "Erreur lors de la récupération des utilisateurs" };
  }
}

/**
 * Get current user info with role
 */
export async function getCurrentUserInfo() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) {
    return { success: false, error: "Non authentifié" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: dbUser.id },
      include: {
        coachedTeams: {
          include: {
            tournament: true,
            group: true,
            _count: {
              select: { players: true },
            },
          },
        },
        players: {
          include: {
            team: {
              include: {
                tournament: true,
              },
            },
          },
        },
      },
    });

    return { success: true, data: user };
  } catch (error) {
    console.error("Error fetching user info:", error);
    return { success: false, error: "Erreur lors de la récupération des informations" };
  }
}
