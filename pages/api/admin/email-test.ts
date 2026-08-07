/**
 * POST /api/admin/email-test
 *
 * Envoie un email de vérification pour tester la config Resend. Réservé au
 * propriétaire (comme les autres actions sensibles). Par défaut envoie à sa
 * propre adresse ; `{ to }` permet de cibler une autre adresse.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { syncClerkUserById } from '@/lib/clerk';
import { isOwnerEmail } from '@/lib/utils/permissions';
import { sendEmail, isEmailConfigured } from '@/lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return res.status(401).json({ error: 'Utilisateur introuvable' });
  if (!isOwnerEmail(dbUser.email)) {
    return res.status(403).json({ error: 'Réservé au propriétaire du site', code: 'OWNER_ONLY' });
  }

  const bodyTo = typeof (req.body as { to?: unknown })?.to === 'string' ? (req.body as { to: string }).to.trim() : '';
  const to = bodyTo || dbUser.email;
  if (!to) return res.status(400).json({ error: 'Aucune adresse de destination' });

  const result = await sendEmail({
    to,
    subject: 'Test email — CDM 26',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0a0a0a;color:#fff;border-radius:16px">
        <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#fbbf24">CDM 26</div>
        <h1 style="font-size:22px;margin:12px 0 6px">Ça marche ✅</h1>
        <p style="color:#b5b5b5;line-height:1.6">
          Si tu lis ce message, ta configuration Resend est bonne : les invitations
          « crée ton équipe » partiront bien par email.
        </p>
      </div>`,
    text: "Config Resend OK — les invitations partiront par email.",
  });

  if (result.mocked) {
    return res.status(200).json({
      ok: true,
      mocked: true,
      to,
      message: 'RESEND_API_KEY absente : email mocké (rien envoyé). Configure la clé pour de vrais envois.',
    });
  }
  if (!result.ok) {
    return res.status(502).json({ ok: false, to, error: result.error ?? 'Envoi échoué' });
  }
  return res.status(200).json({ ok: true, to, configured: isEmailConfigured() });
}
