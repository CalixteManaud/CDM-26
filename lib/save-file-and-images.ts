// lib/save-file-and-images.ts
import { put } from "@vercel/blob";
import sharp from "sharp";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Sauvegarde un fichier uploadé par l'utilisateur vers Vercel Blob.
 * Si c'est une image, elle est compressée en WebP.
 * Si c'est un autre type de fichier (PDF, CSV...), il est uploadé tel quel.
 */
export async function saveUploadedFileToBlob(
    file: File,
    userId: string,
    FOLDER_NAME: string = "can-26-blob"
): Promise<{ url: string; pathname: string; contentType: string }> {
    try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);

        let processedBuffer: Buffer;
        let finalContentType: string;
        let finalExtension: string;

        if (isImage) {
            processedBuffer = await sharp(fileBuffer)
                .webp({ quality: 80 })
                .toBuffer();
            finalContentType = "image/webp";
            finalExtension = ".webp";
        } else {
            processedBuffer = fileBuffer;
            finalContentType = file.type || "application/octet-stream";
            const extension = file.name.split('.').pop();
            finalExtension = extension ? `.${extension}` : '';
        }

        const sanitizedBaseName = file.name
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .split('.').slice(0, -1).join('.')
            || "file";

        const finalName = `${userId}-${Date.now()}-${sanitizedBaseName}${finalExtension}`;
        const pathname = `/${FOLDER_NAME}/${finalName}`;

        const blob = await put(pathname, processedBuffer, {
            access: "public",
            contentType: finalContentType,
            addRandomSuffix: false,
        });

        return {
            url: blob.url,
            pathname: blob.pathname,
            contentType: finalContentType,
        };
    } catch (error) {
        console.error("Error saving uploaded file to blob:", error);
        throw new Error("Erreur lors de la sauvegarde du fichier");
    }
}

