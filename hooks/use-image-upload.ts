// hooks/use-image-upload.ts
"use server";

import { saveUploadedFileToBlob } from "@/lib/save-file-and-images";
import { auth } from "@clerk/nextjs/server";

interface ActionResponse {
    url?: string;
    error?: string;
}

export async function uploadImage(formData: FormData): Promise<ActionResponse> {
    try {
        const { userId } = await auth();
        if (!userId)
            return { error: "Non authentifié" };


        const file = formData.get("file") as File | null;

        if (!file)
            return { error: "Fichier non fourni" };

        const result = await saveUploadedFileToBlob(
            file,
            userId,
            "can-26-blob"
        );

        return { url: result.url };
    } catch (error) {
        console.error("Error uploading image:", error);
        const message = error instanceof Error ? error.message : "Erreur lors du téléchargement de l'image";
        return { error: message };
    }
}