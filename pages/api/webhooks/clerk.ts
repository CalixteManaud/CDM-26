import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextApiRequest, NextApiResponse } from 'next';
import { UserRole } from '@/prisma/prisma-client/enums';
import prisma from '@/lib/prisma';
import { extractTwitchFromClerkWebhook } from '@/lib/clerk';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(req: NextApiRequest) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET must be defined in environment variables');
  }

  const payload = await buffer(req);
  const payloadString = payload.toString();

  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(payloadString, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const eventType = evt.type;

  // Gérer les événements user.created et user.updated
  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, username } = evt.data;

    const email = email_addresses[0]?.email_address;
    if (!email) {
      return res.status(400).json({ error: 'No email found' });
    }

    const name = `${first_name || ''} ${last_name || ''}`.trim() || username || 'User';

    // Extraction OAuth Twitch (si l'utilisateur s'est connecté avec Twitch)
    const twitch = extractTwitchFromClerkWebhook(evt.data);

    try {
      // Créer ou mettre à jour l'utilisateur dans la base de données
      const dbUser = await prisma.user.upsert({
        where: { clerkId: id },
        update: {
          email,
          name,
        },
        create: {
          clerkId: id,
          email,
          name,
          role: UserRole.GUEST, // Rôle par défaut (GUEST)
        },
      });

      // Synchroniser le lien Twitch dans une étape séparée pour gérer
      // proprement les conflits (un autre user a déjà ce twitchUsername).
      if (twitch) {
        try {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              twitchUsername: twitch.username,
              twitchUserId: twitch.providerUserId,
            },
          });
          console.log(`🟣 Twitch lié: ${dbUser.email} → @${twitch.username}`);
        } catch (linkError) {
          const code = (linkError as { code?: string })?.code;
          if (code === 'P2002') {
            console.warn(
              `[clerk webhook] Conflit unique twitchUsername pour ${dbUser.email} → @${twitch.username}. Skip.`
            );
          } else {
            console.error('Error syncing Twitch link:', linkError);
          }
        }
      }

      console.log(`✅ User ${eventType}: ${email}`);
    } catch (error) {
      console.error('Error syncing user:', error);
      return res.status(500).json({ error: 'Failed to sync user' });
    }
  }

  // Gérer la suppression d'utilisateur
  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    try {
      await prisma.user.delete({
        where: { clerkId: id },
      });
      console.log(`✅ User deleted: ${id}`);
    } catch (error) {
      console.error('Error deleting user:', error);
      // Ne pas retourner d'erreur si l'utilisateur n'existe pas
    }
  }

  return res.status(200).json({ received: true });
}
