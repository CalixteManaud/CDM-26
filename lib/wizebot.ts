/**
 * Wizebot integration helpers.
 *
 * Wizebot sert UNIQUEMENT de wallet pour les points de chaîne Twitch :
 *  - debitWizebotPoints : débite quand l'user place un pari depuis le site
 *  - creditWizebotPoints : crédite quand le settlement attribue un payout
 *
 * Pas d'inbound webhook — les paris ne passent plus par le chat, donc plus
 * de commande !parier ni d'endpoint /api/wizebot/bets.
 *
 * En dev (env vars manquantes), les appels sortants sont mockés et loggés
 * pour que tu puisses tester le flow complet sans toucher au vrai bot.
 */

const WIZEBOT_API_BASE = process.env.WIZEBOT_API_BASE || 'https://api.wizebot.tv/v1';

export class WizebotApiError extends Error {
  constructor(message: string, public statusCode?: number, public body?: unknown) {
    super(message);
  }
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
 * Débite des points de chaîne sur le compte Wizebot d'un viewer.
 * Utilisé par les paris placés depuis le site (le chat Twitch via Wizebot
 * débite avant d'appeler notre webhook, donc inutile dans ce sens-là).
 *
 * Mocked en dev si la config Wizebot manque (pas d'erreur, log uniquement).
 */
export async function debitWizebotPoints(params: {
  twitchUsername: string;
  amount: number;
  reason?: string;
}): Promise<{ ok: true; txId: string } | { ok: false; error: string; code?: string }> {
  const apiKey = process.env.WIZEBOT_API_KEY;
  const channel = process.env.WIZEBOT_CHANNEL;

  if (!apiKey || !channel) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, error: 'WIZEBOT_API_KEY ou WIZEBOT_CHANNEL non défini', code: 'CONFIG' };
    }
    const mockTx = `mock_debit_${Date.now()}_${params.twitchUsername}`;
    console.log(
      `[wizebot:mock] debit ${params.amount} pts ← ${params.twitchUsername} (reason: ${params.reason ?? 'n/a'}) tx=${mockTx}`
    );
    return { ok: true, txId: mockTx };
  }

  try {
    const res = await fetch(`${WIZEBOT_API_BASE}/${encodeURIComponent(channel)}/points/remove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        user: params.twitchUsername,
        amount: params.amount,
        reason: params.reason ?? 'CDM 26 — pari placé depuis le site',
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      // Wizebot renvoie typiquement 4xx avec un message texte si le viewer
      // n'a pas assez de points. On distingue ce cas pour un message UX clair.
      const msg = body.slice(0, 200);
      const code = /insufficient|not enough|solde/i.test(msg) ? 'INSUFFICIENT_FUNDS' : 'WIZEBOT_ERROR';
      return { ok: false, error: `Wizebot HTTP ${res.status}: ${msg}`, code };
    }

    const json = (await res.json().catch(() => ({}))) as { txId?: string; id?: string };
    return { ok: true, txId: json.txId ?? json.id ?? `wzb_${Date.now()}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erreur réseau Wizebot',
      code: 'NETWORK',
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
