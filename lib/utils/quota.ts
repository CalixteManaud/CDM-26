/**
 * Quotas de mise (points de chaîne Wizebot) — limites cumulatives par jour et
 * par match, en plus des limites unitaires MIN/MAX_BET_POINTS.
 *
 * Fichier pur (aucune dépendance Prisma / Clerk / Wizebot) → consommable côté
 * client (affichage du quota restant) comme côté serveur. La logique d'agrégation
 * DB vit dans `lib/utils/bet-quota.ts`.
 */

/** Total de points qu'un user peut engager par jour, tous paris confondus. */
export const DAILY_POINT_QUOTA = 100_000;

/** Total de points qu'un user peut engager sur un même match (1X2 + marchés). */
export const PER_MATCH_POINT_QUOTA = 50_000;

/** Fuseau de référence pour le « jour » de remise à zéro du quota. */
export const QUOTA_TIMEZONE = 'Europe/Paris';

/**
 * Début du jour courant (00h00) dans le fuseau `QUOTA_TIMEZONE`, retourné comme
 * instant absolu (Date UTC). Robuste au changement d'heure été/hiver : on dérive
 * l'offset réel de Paris au moment `now` via Intl, sans dépendance externe.
 */
export function quotaDayStart(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: QUOTA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour') % 24; // certains runtimes renvoient 24 à minuit
  const minute = get('minute');
  const second = get('second');

  // Wall-clock Paris exprimée en ms "comme si UTC", puis on en déduit l'offset.
  const wallNowMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetMs = wallNowMs - now.getTime(); // Paris = UTC + offset
  const wallMidnightMs = Date.UTC(year, month - 1, day, 0, 0, 0);
  return new Date(wallMidnightMs - offsetMs);
}
