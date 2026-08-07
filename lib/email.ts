/**
 * Envoi d'email via Resend (REST API, sans SDK → zéro dépendance).
 *
 * Optionnel, sur le modèle Wizebot : si `RESEND_API_KEY` est absente (dev, ou
 * pas encore configuré), l'appel est **mocké** (log + succès) au lieu d'échouer.
 * En prod, configure `RESEND_API_KEY` + `EMAIL_FROM` (domaine vérifié Resend).
 */

type SendResult = { ok: boolean; mocked?: boolean; error?: string };

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'CDM 26 <onboarding@resend.dev>';

  if (!key) {
    console.warn('[email] RESEND_API_KEY absente — email mocké', {
      to: params.to,
      subject: params.subject,
    });
    return { ok: true, mocked: true };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[email] envoi Resend échoué', res.status, body);
      return { ok: false, error: `Resend ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('[email] erreur réseau Resend', err);
    return { ok: false, error: err instanceof Error ? err.message : 'email failed' };
  }
}
