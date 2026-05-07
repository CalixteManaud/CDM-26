/**
 * Wizebot integration helpers.
 *
 * Wizebot fournit deux ponts :
 *  - Inbound  (Wizebot → notre API) : webhook custom configurable via
 *    "Actions web" dans le dashboard Wizebot. On vérifie un secret partagé
 *    passé en header `x-wizebot-secret`.
 *  - Outbound (notre API → Wizebot) : appels REST authentifiés par
 *    une clé API stockée dans WIZEBOT_API_KEY.
 *
 * En dev (env vars manquantes), les appels sortants sont mockés et loggés
 * pour que tu puisses tester le flow complet sans toucher au vrai bot.
 */

const WIZEBOT_API_BASE = process.env.WIZEBOT_API_BASE || 'https://api.wizebot.tv/v1';

export class WizebotConfigError extends Error {}
export class WizebotApiError extends Error {
  constructor(message: string, public statusCode?: number, public body?: unknown) {
    super(message);
  }
}

/**
 * Valide qu'un webhook entrant vient bien de Wizebot via le secret partagé.
 * Constant-time comparison pour éviter les timing attacks.
 */
export function verifyWizebotInbound(receivedSecret: string | undefined | string[]): boolean {
  const expected = process.env.WIZEBOT_INBOUND_SECRET;
  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      throw new WizebotConfigError(
        'WIZEBOT_INBOUND_SECRET non défini — les paris ne peuvent pas être validés en production.'
      );
    }
    // En dev, on tolère l'absence pour permettre les tests rapides
    console.warn('[wizebot] WIZEBOT_INBOUND_SECRET non défini — validation désactivée (dev only)');
    return true;
  }

  const provided = Array.isArray(receivedSecret) ? receivedSecret[0] : receivedSecret;
  if (!provided || provided.length !== expected.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Crédite des points de chaîne sur le compte Wizebot d'un viewer.
 * Retourne l'ID de transaction Wizebot pour l'audit.
 */
export async function creditWizebotPoints(params: {
  twitchUsername: string;
  amount: number;
  reason?: string;
}): Promise<{ ok: true; txId: string } | { ok: false; error: string }> {
  const apiKey = process.env.WIZEBOT_API_KEY;
  const channel = process.env.WIZEBOT_CHANNEL;

  if (!apiKey || !channel) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, error: 'WIZEBOT_API_KEY ou WIZEBOT_CHANNEL non défini' };
    }
    // Mock en dev
    const mockTx = `mock_${Date.now()}_${params.twitchUsername}`;
    console.log(
      `[wizebot:mock] credit ${params.amount} pts → ${params.twitchUsername} (reason: ${params.reason ?? 'n/a'}) tx=${mockTx}`
    );
    return { ok: true, txId: mockTx };
  }

  try {
    const res = await fetch(`${WIZEBOT_API_BASE}/${encodeURIComponent(channel)}/points/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        user: params.twitchUsername,
        amount: params.amount,
        reason: params.reason ?? 'CDM 26 — pari gagné',
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        ok: false,
        error: `Wizebot a renvoyé HTTP ${res.status}: ${body.slice(0, 200)}`,
      };
    }

    const json = (await res.json().catch(() => ({}))) as { txId?: string; id?: string };
    return { ok: true, txId: json.txId ?? json.id ?? `wzb_${Date.now()}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erreur réseau Wizebot',
    };
  }
}

/**
 * Normalise un username Twitch (lowercase, sans espaces, sans @).
 * Twitch impose: 4-25 caractères, lettres/chiffres/underscores uniquement.
 */
export function normalizeTwitchUsername(input: string): string {
  return input.trim().toLowerCase().replace(/^@/, '');
}

const TWITCH_USERNAME_REGEX = /^[a-zA-Z0-9_]{4,25}$/;

export function isValidTwitchUsername(input: string): boolean {
  return TWITCH_USERNAME_REGEX.test(input);
}
