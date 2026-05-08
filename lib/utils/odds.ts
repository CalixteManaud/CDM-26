/**
 * Helpers purs pour le calcul des cotes en pari mutuel.
 *
 * Aucune dépendance à Prisma / Clerk / Wizebot — utilisable depuis les
 * composants client (Pages Router → pas de RSC, donc tout import lib/* qui
 * touche au runtime serveur fuiterait dans le bundle navigateur).
 */

export type LiveOdds = {
  home: number | null;
  draw: number | null;
  away: number | null;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Calcule les cotes en direct depuis les totaux d'un pool.
 * Retourne `null` pour une issue où personne n'a parié (cote infinie).
 */
export function computeLiveOdds(pool: {
  totalHomePool: number;
  totalDrawPool: number;
  totalAwayPool: number;
  housePercentage: { toString(): string } | number;
}): LiveOdds {
  const home = Number(pool.totalHomePool);
  const draw = Number(pool.totalDrawPool);
  const away = Number(pool.totalAwayPool);
  const total = home + draw + away;
  const houseFactor = 1 - Number(pool.housePercentage) / 100;

  if (total === 0) return { home: null, draw: null, away: null };

  return {
    home: home > 0 ? round3((total / home) * houseFactor) : null,
    draw: draw > 0 ? round3((total / draw) * houseFactor) : null,
    away: away > 0 ? round3((total / away) * houseFactor) : null,
  };
}

/**
 * Fenêtre live betting : on continue d'accepter des paris jusqu'à
 * `matchDate + LIVE_WINDOW_MINUTES`. À régler selon la durée moyenne d'un
 * match FIFA 26 (mi-temps + temps additionnel inclus).
 */
const LIVE_WINDOW_MINUTES = 25;

/**
 * Vrai si le match accepte encore des paris.
 * Logique :
 *  - SCHEDULED → ouvert tant qu'on est avant matchDate
 *  - LIVE → ouvert pendant la fenêtre live (matchDate + LIVE_WINDOW_MINUTES)
 *  - sinon → fermé
 */
export function isBettingOpen(match: {
  status: string;
  matchDate: Date | string;
}): boolean {
  const md = new Date(match.matchDate).getTime();
  const now = Date.now();
  if (match.status === 'SCHEDULED') return now < md;
  if (match.status === 'LIVE') {
    return now < md + LIVE_WINDOW_MINUTES * 60 * 1000;
  }
  return false;
}

/**
 * Phase courante du marché 1X2 sur ce match.
 *  - 'PRE'   → avant le coup d'envoi (cotes "stables")
 *  - 'LIVE'  → match en cours (cotes mouvantes — polling recommandé côté UI)
 *  - 'CLOSED' → match terminé / annulé / fermé
 */
export function bettingPhase(match: {
  status: string;
  matchDate: Date | string;
}): 'PRE' | 'LIVE' | 'CLOSED' {
  const md = new Date(match.matchDate).getTime();
  const now = Date.now();
  if (match.status === 'SCHEDULED' && now < md) return 'PRE';
  if (
    match.status === 'LIVE' &&
    now < md + LIVE_WINDOW_MINUTES * 60 * 1000
  ) {
    return 'LIVE';
  }
  return 'CLOSED';
}
