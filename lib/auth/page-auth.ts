import { getAuth, clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export type AuthRequest = Parameters<typeof getAuth>[0];

export async function getCurrentDbUserFromReq(req: AuthRequest) {
    if (!req) return null; // ✅ évite crash si req oublié

    const { userId } = getAuth(req);
    if (!userId) return null;

    const client =
        typeof clerkClient === "function" ? await clerkClient() : clerkClient;

    const clerkUser = await client.users.getUser(userId);

    return prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
    });
}
