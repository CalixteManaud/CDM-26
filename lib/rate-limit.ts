/**
 * Rate limiting pour les routes sensibles (paris).
 *
 * Auto-détection :
 *  - Si `KV_REST_API_URL` + `KV_REST_API_TOKEN` sont définis ET les packages
 *    `@upstash/ratelimit` + `@upstash/redis` sont installés → on bascule sur
 *    Upstash (cohérent multi-instance, requis en prod).
 *  - Sinon → fallback in-memory process-local (suffit en dev / single-lambda).
 *
 * L'init Upstash est lazy et silencieuse : si l'import échoue (package absent),
 * on retombe sur l'in-memory sans bruit.
 *
 * Setup prod :
 *   1. Vercel Dashboard > Storage > Create > KV (powered by Upstash)
 *   2. Lier au projet → KV_REST_API_URL + KV_REST_API_TOKEN auto-injectés
 *   3. (Déjà fait) `npm install @upstash/ratelimit @upstash/redis`
 *   4. Redéployer
 */

import type { NextApiRequest } from 'next';

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number; // Timestamp ms
};

// ====================== Fallback in-memory ======================
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function inMemoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (existing.count >= limit) {
    return { success: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count++;
  return { success: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

// GC périodique léger pour éviter une fuite mémoire en long-running process.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) {
      if (v.resetAt < now) buckets.delete(k);
    }
  }, 60_000).unref?.();
}

// ====================== Upstash (lazy init) ======================
type UpstashLimiter = {
  limit: (key: string) => Promise<{ success: boolean; remaining: number; reset: number }>;
};

let upstashLimiter: UpstashLimiter | null = null;
let upstashInitTried = false;

async function ensureUpstash() {
  if (upstashInitTried) return;
  upstashInitTried = true;

  // Vercel Marketplace > Upstash for Redis injecte KV_REST_API_URL/TOKEN
  // (compat "Vercel KV" legacy). Une instance Upstash créée hors Vercel utilise
  // UPSTASH_REDIS_REST_URL/TOKEN. On accepte les deux pour rester portable.
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;

  try {
    // Dynamic import + `any` cast : tolère l'absence des packages (in-memory prend
    // le relais). Une fois installés, TypeScript voit les vrais types via le module.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const ratelimitMod: any = await import('@upstash/ratelimit').catch(() => null);
    const redisMod: any = await import('@upstash/redis').catch(() => null);
    /* eslint-enable @typescript-eslint/no-explicit-any */
    if (!ratelimitMod || !redisMod) return;

    const redis = new redisMod.Redis({ url, token });

    upstashLimiter = new ratelimitMod.Ratelimit({
      redis,
      limiter: ratelimitMod.Ratelimit.slidingWindow(10, '60 s'),
      analytics: true,
      prefix: 'cdm26:bet',
    });
  } catch (err) {
    console.warn('[rate-limit] Upstash init failed, falling back to in-memory:', err);
  }
}

// ====================== API publique ======================

/**
 * Applique la limite via Upstash si dispo, sinon in-memory. Si l'appel Upstash
 * échoue au runtime (DNS mort, réseau, instance down), on NE casse PAS la requête
 * appelante : on log, on désactive Upstash pour le reste du process (évite de
 * re-taper un hôte mort à chaque requête → latence DNS répétée) et on retombe
 * sur l'in-memory. Une panne du rate-limiter ne doit jamais bloquer un pari.
 */
async function applyLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  await ensureUpstash();
  if (upstashLimiter) {
    try {
      const r = await upstashLimiter.limit(key);
      return { success: r.success, remaining: r.remaining, resetAt: r.reset };
    } catch (err) {
      console.warn('[rate-limit] Upstash limit() failed, falling back to in-memory:', err);
      upstashLimiter = null; // circuit-break : on arrête de solliciter l'hôte mort
    }
  }
  return inMemoryLimit(key, limit, windowMs);
}

/**
 * Limite les placements de paris à 10 / minute / user.
 * @param userId DB user ID (utilisé comme clé — pas l'IP, pour pas pénaliser le NAT)
 */
export async function rateLimitBet(userId: string): Promise<RateLimitResult> {
  return applyLimit(`bet:${userId}`, 10, 60_000);
}

/**
 * Limite les transferts de points à 5 / minute / user (anti-spam / anti-abus).
 * @param userId DB user ID de l'expéditeur.
 */
export async function rateLimitTransfer(userId: string): Promise<RateLimitResult> {
  return applyLimit(`transfer:${userId}`, 5, 60_000);
}

/**
 * Extrait l'IP du client pour un fallback si pas d'user authentifié.
 */
export function getClientIp(req: NextApiRequest): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string') return xff.split(',')[0].trim();
  if (Array.isArray(xff)) return xff[0];
  return req.socket?.remoteAddress ?? 'unknown';
}
