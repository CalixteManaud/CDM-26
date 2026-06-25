import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { saveUploadedFileToBlob } from '@/lib/save-file-and-images';
import { IncomingForm, Files } from 'formidable';
import fs from 'fs';

// Disable body parsing, formidable will handle it
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Parse form data with formidable — bornes anti-abus :
    // - 1 seul fichier
    // - 8 Mo max (évite OOM Sharp + coût Blob)
    // - images uniquement (filtre le content-type au parsing)
    const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
    const form = new IncomingForm({
      maxFiles: 1,
      maxFileSize: MAX_UPLOAD_BYTES,
      filter: ({ mimetype }) => !!mimetype && mimetype.startsWith('image/'),
    });

    let files: Files;
    try {
      files = await new Promise<Files>((resolve, reject) => {
        form.parse(req, (err, _fields, files) => {
          if (err) reject(err);
          else resolve(files);
        });
      });
    } catch (parseErr) {
      // formidable lève sur dépassement de taille ou type filtré → 400/413 clair
      const code = (parseErr as { code?: number })?.code;
      // 1009 = biggerThanMaxFileSize (formidable)
      if (code === 1009) {
        return res.status(413).json({ error: 'Fichier trop volumineux (8 Mo max)' });
      }
      return res.status(400).json({ error: 'Fichier invalide (image de 8 Mo max attendue)' });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'Fichier non fourni' });
    }

    // Double check côté serveur (le filtre formidable peut être contourné si le
    // client ment sur le content-type multipart).
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      await fs.promises.unlink(file.filepath).catch(() => {});
      return res.status(400).json({ error: 'Seules les images sont acceptées' });
    }

    // Read file buffer
    const fileBuffer = await fs.promises.readFile(file.filepath);

    // Create File object from buffer
    const uploadFile = new File([fileBuffer], file.originalFilename || 'image', {
      type: file.mimetype || 'application/octet-stream',
    });

    // Upload to Vercel Blob
    const result = await saveUploadedFileToBlob(uploadFile, userId, 'can-26-blob');

    // Clean up temp file
    await fs.promises.unlink(file.filepath);

    return res.status(200).json({ url: result.url });
  } catch (error) {
    console.error('Error uploading image:', error);
    const message = error instanceof Error ? error.message : 'Erreur lors du téléchargement';
    return res.status(500).json({ error: message });
  }
}
