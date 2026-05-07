import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { saveUploadedFileToBlob } from '@/lib/save-file-and-images';
import { IncomingForm, Fields, Files } from 'formidable';
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

    // Parse form data with formidable
    const form = new IncomingForm();

    const [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'Fichier non fourni' });
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
