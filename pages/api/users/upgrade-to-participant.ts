import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";
import { canUpgradeToParticipant } from "@/lib/utils/permissions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(401).json({ success: false, error: "Non authentifié" });
    }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true, role: true },
    });

    if (!dbUser) {
        return res.status(404).json({ success: false, error: "Utilisateur introuvable" });
    }

    const canUpgrade = await canUpgradeToParticipant(dbUser.id);
    if (!canUpgrade) {
        return res.status(403).json({
            success: false,
            error: "Vous ne pouvez pas effectuer cette mise à niveau",
        });
    }

    const updated = await prisma.user.update({
        where: { id: dbUser.id },
        data: { role: "PARTICIPANT" },
        select: { role: true },
    });

    return res.status(200).json({ success: true, data: { role: updated.role } });
}
