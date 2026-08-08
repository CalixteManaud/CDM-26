/**
 * Helpers purs pour le calcul des cotes en pari mutuel.
 *
 * Aucune dépendance à Prisma / Clerk / Wizebot — utilisable depuis les
 * composants client (Pages Router → pas de RSC, donc tout import lib/* qui
 * touche au runtime serveur fuiterait dans le bundle navigateur).
 */

// Limites de mise (points de chaîne Wizebot). Définies ici pour être consommées
// à la fois côté serveur (API routes, betting.ts) et côté client (PlaceBetForm,
// etc.) sans risque de tirer Prisma dans le bundle navigateur.
export const MIN_BET_POINTS = 1;
export const MAX_BET_POINTS = 50_000;

/**
 * Fenêtre pendant laquelle un pari fraîchement placé reste modifiable / annulable
 * par son auteur (3 min après `Bet.createdAt`). Au-delà, ou si les paris du match
 * se ferment avant, le pari est figé. Appliqué côté serveur (autoritatif) ET
 * affiché en compte à rebours côté client.
 */
export const BET_EDIT_WINDOW_MS = 3 * 60 * 1000;

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
 * Modèle pre-match uniquement : les paris ferment au coup d'envoi.
 *  - SCHEDULED → ouvert tant qu'on est avant matchDate
 *  - LIVE (ou tout autre statut) → fermé
 * Dès que le match est lancé, plus aucun pari n'est accepté.
 */
/**
 * Modèle status-only : les paris sont ouverts tant que le match est SCHEDULED,
 * et ferment dès qu'il passe LIVE (ou FINISHED / CANCELED). L'horaire prévu
 * (matchDate) n'est PAS un butoir — c'est le passage en LIVE par l'admin qui
 * verrouille. `matchDate` reste accepté (appelants historiques) mais ignoré.
 */
export function isBettingOpen(match: {
  status: string;
  matchDate?: Date | string;
}): boolean {
  return match.status === 'SCHEDULED';
}

/**
 * Phase courante du marché 1X2 sur ce match.
 *  - 'PRE'   → match programmé, paris ouverts
 *  - 'LIVE'  → match en cours (paris fermés, cotes figées en lecture seule)
 *  - 'CLOSED' → match terminé / annulé
 */
export function bettingPhase(match: {
  status: string;
  matchDate?: Date | string;
}): 'PRE' | 'LIVE' | 'CLOSED' {
  if (match.status === 'SCHEDULED') return 'PRE';
  if (match.status === 'LIVE') return 'LIVE';
  return 'CLOSED';
}
