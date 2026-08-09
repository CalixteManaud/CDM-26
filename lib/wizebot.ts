/**
 * Wizebot integration helpers.
 *
 * Wizebot sert UNIQUEMENT de wallet pour les points de chaîne Twitch :
 *  - debitWizebotPoints  : débite quand l'user place un pari depuis le site
 *  - creditWizebotPoints : crédite quand le settlement attribue un payout
 *
 * Pas d'inbound webhook — les paris ne passent plus par le chat, donc plus
 * de commande !parier ni d'endpoint /api/wizebot/bets.
 *
 * API REST officielle (Wizebot — "Monnaie virtuelle") :
 *   POST https://wapi.wizebot.tv/api/currency/{API_KEY}/action/add/{viewer}/{amount}
 *   POST https://wapi.wizebot.tv/api/currency/{API_KEY}/action/remove/{viewer}/{amount}/{force}
 *
 * Particularités à connaître :
 *  - La clé API est dans le PATH (pas de header Authorization). C'est volontaire
 *    côté Wizebot, mais ça veut dire qu'il faut éviter de logger l'URL complète.
 *  - La clé API scope déjà au channel — pas besoin d'un WIZEBOT_CHANNEL séparé.
 *  - VIEWER_IDENTIFIER = login Twitch (lowercase) ou ID numérique de plateforme.
 *  - Pour remove, FORCE=0 → renvoie `error_code: 'insufficient_funds'` si le
 *    solde est insuffisant. C'est ce qu'on veut pour les paris (pas de débit
 *    en négatif). FORCE=1 force le débit même en négatif (jamais utilisé ici).
 *  - Wizebot peut renvoyer HTTP 200 avec `error_code` dans le body JSON — on
 *    parse les deux cas.
 *
 * En dev (env vars manquantes), les appels sortants sont mockés et loggés
 * pour que tu puisses tester le flow complet sans toucher au vrai bot.
 *
 * Doc Wizebot : https://support.wizebot.tv/docs/api_currency
 */

const WIZEBOT_API_BASE = process.env.WIZEBOT_API_BASE || 'https://wapi.wizebot.tv/api/currency';

// Timeout par appel HTTP. 8s couvre largement la latence Wizebot normale (~300ms)
// tout en évitant de bloquer une route Next.js indéfiniment si l'API est down.
const WIZEBOT_TIMEOUT_MS = 8_000;

// Retry policy : 1 retry max, uniquement sur 5xx ou erreurs réseau. On NE retry
// PAS sur 4xx (insufficient_funds, bad request) — re-rejouer pourrait double-débiter.
const WIZEBOT_MAX_RETRIES = 1;
const WIZEBOT_RETRY_DELAY_MS = 250;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Anti-spam Wizebot : l'API renvoie HTTP 500 `spam_limit_exceeded` si on
// l'appelle trop vite (typiquement au settlement qui crédite plein de gagnants
// d'un coup). On sérialise donc TOUS les appels Wizebot avec un intervalle mini.
// Un appel isolé (débit d'un pari) reste immédiat ; seuls les appels en rafale
// sont espacés. Configurable via WIZEBOT_MIN_INTERVAL_MS.
const WIZEBOT_MIN_INTERVAL_MS = Number(process.env.WIZEBOT_MIN_INTERVAL_MS) || 1500;
let wizebotGate: Promise<void> = Promise.resolve();

/** File d'attente sérielle : espace chaque appel du précédent d'au moins l'intervalle. */
function throttleWizebot(): Promise<void> {
  const prev = wizebotGate;
  wizebotGate = prev.then(() => sleep(WIZEBOT_MIN_INTERVAL_MS));
  return prev;
}

type WizebotResponse = {
  success?: boolean;
  status?: string;
  error_code?: string;
  message?: string;
};

/**
 * Wrap fetch avec :
 *  - AbortController + timeout
 *  - 1 retry sur 5xx / erreurs réseau (jamais sur 4xx)
 * Renvoie soit la réponse, soit une erreur "synthétique" si toutes les tentatives ont échoué.
 */
async function wizebotFetch(url: string, init?: RequestInit): Promise<Response> {
  // Anti-spam : sérialise/espace les appels avant même le 1er essai.
  await throttleWizebot();

  let lastError: unknown;
  for (let attempt = 0; attempt <= WIZEBOT_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WIZEBOT_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      // Retry uniquement sur 5xx
      if (res.status >= 500 && res.status < 600 && attempt < WIZEBOT_MAX_RETRIES) {
        await sleep(WIZEBOT_RETRY_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      // Erreur réseau / timeout : retry une fois
      if (attempt < WIZEBOT_MAX_RETRIES) {
        await sleep(WIZEBOT_RETRY_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
    }
  }
  throw lastError ?? new Error('Wizebot fetch failed');
}

export class WizebotApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public body?: unknown
  ) {
    super(message);
  }
}

/**
 * Détecte les erreurs "solde insuffisant" — utilisé par debit pour distinguer
 * un cas UX courant (à afficher proprement à l'utilisateur) d'un vrai problème
 * réseau ou API.
 */
function isInsufficientFunds(body: string, json: WizebotResponse): boolean {
  if (json.error_code === 'insufficient_funds') return true;
  return /insufficient_funds|insufficient|not enough|solde insuffisant/i.test(body);
}

/**
 * Crédite des points de chaîne sur le compte Wizebot d'un viewer.
 * Le paramètre `reason` est conservé pour compat (callers existants) mais
 * n'est pas envoyé à Wizebot (leur API ne le supporte pas).
 */
export async function creditWizebotPoints(params: {
  twitchUsername: string;
  amount: number;
  reason?: string;
}): Promise<{ ok: true; txId: string } | { ok: false; error: string }> {
  const apiKey = process.env.WIZEBOT_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, error: 'WIZEBOT_API_KEY non défini' };
    }
    const mockTx = `mock_credit_${Date.now()}_${params.twitchUsername}`;
    console.log(
      `[wizebot:mock] credit ${params.amount} pts → ${params.twitchUsername} (reason: ${
        params.reason ?? 'n/a'
      }) tx=${mockTx}`
    );
    return { ok: true, txId: mockTx };
  }

  const viewer = encodeURIComponent(params.twitchUsername.toLowerCase().trim());
  const amount = encodeURIComponent(String(Math.floor(params.amount)));
  const url = `${WIZEBOT_API_BASE}/${apiKey}/action/add/${viewer}/${amount}`;

  try {
    const res = await wizebotFetch(url, { method: 'POST' });
    const body = await res.text().catch(() => '');
    let json: WizebotResponse = {};
    try {
      json = body ? (JSON.parse(body) as WizebotResponse) : {};
    } catch {
      // Wizebot n'a pas renvoyé du JSON — on garde body brut pour l'erreur.
    }

    if (!res.ok || json.error_code) {
      return {
        ok: false,
        // Pas d'URL dans le message — la clé API y est embarquée.
        error: `Wizebot HTTP ${res.status}${
          json.error_code ? ` (${json.error_code})` : ''
        }: ${body.slice(0, 200)}`,
      };
    }

    // Wizebot ne renvoie pas de tx ID dans la réponse documentée — on génère
    // un identifiant local pour l'audit trail côté CDM 26 (Bet.wizebotCreditTxId).
    return { ok: true, txId: `wzb_${Date.now()}_${params.twitchUsername}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erreur réseau Wizebot',
    };
  }
}

/**
 * Débite des points de chaîne sur le compte Wizebot d'un viewer.
 *
 * FORCE=0 → si solde insuffisant, l'appel échoue avec error_code='insufficient_funds'.
 * C'est ce qu'on veut : on ne laisse jamais un user parier plus qu'il a.
 *
 * Mocked en dev si WIZEBOT_API_KEY manque (pas d'erreur, log uniquement).
 */
export async function debitWizebotPoints(params: {
  twitchUsername: string;
  amount: number;
  reason?: string;
}): Promise<{ ok: true; txId: string } | { ok: false; error: string; code?: string }> {
  const apiKey = process.env.WIZEBOT_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, error: 'WIZEBOT_API_KEY non défini', code: 'CONFIG' };
    }
    const mockTx = `mock_debit_${Date.now()}_${params.twitchUsername}`;
    console.log(
      `[wizebot:mock] debit ${params.amount} pts ← ${params.twitchUsername} (reason: ${
        params.reason ?? 'n/a'
      }) tx=${mockTx}`
    );
    return { ok: true, txId: mockTx };
  }

  const viewer = encodeURIComponent(params.twitchUsername.toLowerCase().trim());
  const amount = encodeURIComponent(String(Math.floor(params.amount)));
  const url = `${WIZEBOT_API_BASE}/${apiKey}/action/remove/${viewer}/${amount}/0`;

  try {
    const res = await wizebotFetch(url, { method: 'POST' });
    const body = await res.text().catch(() => '');
    let json: WizebotResponse = {};
    try {
      json = body ? (JSON.parse(body) as WizebotResponse) : {};
    } catch {
      // ignore — on garde body brut
    }

    if (!res.ok || json.error_code) {
      const insufficient = isInsufficientFunds(body, json);
      return {
        ok: false,
        error: `Wizebot HTTP ${res.status}${
          json.error_code ? ` (${json.error_code})` : ''
        }: ${body.slice(0, 200)}`,
        code: insufficient ? 'INSUFFICIENT_FUNDS' : 'WIZEBOT_ERROR',
      };
    }

    return { ok: true, txId: `wzb_${Date.now()}_${params.twitchUsername}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erreur réseau Wizebot',
      code: 'NETWORK',
    };
  }
}

/**
 * Récupère le solde de points de chaîne d'un viewer via l'API Wizebot.
 * GET https://wapi.wizebot.tv/api/currency/{API_KEY}/get/{VIEWER_IDENTIFIER}
 */
export async function getWizebotBalance(
  twitchUsername: string
): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  const apiKey = process.env.WIZEBOT_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, error: 'WIZEBOT_API_KEY non défini' };
    }
    const mockBalance = 5000;
    console.log(
      `[wizebot:mock] getBalance ${twitchUsername} → ${mockBalance} pts`
    );
    return { ok: true, balance: mockBalance };
  }

  const viewer = encodeURIComponent(twitchUsername.toLowerCase().trim());
  const url = `${WIZEBOT_API_BASE}/${apiKey}/get/${viewer}`;

  try {
    const res = await wizebotFetch(url, { method: 'GET' });
    const body = await res.text().catch(() => '');
    let json: Record<string, unknown> = {};
    try {
      json = body ? (JSON.parse(body) as Record<string, unknown>) : {};
    } catch {
      // pas du JSON
    }

    if (!res.ok || (json as WizebotResponse).error_code) {
      return {
        ok: false,
        error: `Wizebot HTTP ${res.status}${
          (json as WizebotResponse).error_code
            ? ` (${(json as WizebotResponse).error_code})`
            : ''
        }: ${body.slice(0, 200)}`,
      };
    }

    const balance =
      typeof json.currency === 'number'
        ? json.currency
        : typeof json.balance === 'number'
          ? json.balance
          : typeof json.points === 'number'
            ? json.points
            : typeof json.value === 'number'
              ? json.value
              : typeof json.amount === 'number'
                ? json.amount
                : null;

    if (balance === null) {
      const firstNum = Object.values(json).find((v) => typeof v === 'number');
      if (typeof firstNum === 'number') {
        return { ok: true, balance: firstNum };
      }
      console.warn('[wizebot] getBalance: unexpected response shape', body.slice(0, 300));
      return { ok: false, error: 'Réponse Wizebot inattendue' };
    }

    return { ok: true, balance };
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
