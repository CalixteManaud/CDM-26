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
 * Vrai si le match accepte encore des paris.
 * Logique: SCHEDULED uniquement, ET on est avant matchDate.
 */
export function isBettingOpen(match: {
  status: string;
  matchDate: Date | string;
}): boolean {
  if (match.status !== 'SCHEDULED') return false;
  return new Date() < new Date(match.matchDate);
}
