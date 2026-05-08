// Helpers purs pour les marchés flexibles. NE PAS importer Prisma ni rien
// de server-only ici — ce module est utilisé côté client.

// On déclare le type localement pour éviter de dépendre du prisma-client
// dans les bundles client (et casser le build avant `prisma generate`).
export type BettingMarketType =
  | 'MATCH_EXACT_SCORE'
  | 'MATCH_TOTAL_GOALS'
  | 'MATCH_BTTS'
  | 'TOURNAMENT_TOP_SCORER'
  | 'TOURNAMENT_MVP'
  | 'TOURNAMENT_WINNER';

export type LightPool = {
  outcomeKey: string;
  totalPool: number;
};

/**
 * Cote pari mutuel pour un outcome :
 *   cote = (totalPool / poolOutcome) × (1 - housePct/100)
 * Renvoie null si l'outcome n'a pas de pari (cote infinie / non significative).
 */
export function computeMarketOdds(
  pools: LightPool[],
  housePercentage: number | { toString(): string },
): Record<string, number | null> {
  const houseRatio = 1 - Number(housePercentage) / 100;
  const total = pools.reduce((s, p) => s + p.totalPool, 0);
  const result: Record<string, number | null> = {};
  for (const p of pools) {
    if (total === 0 || p.totalPool === 0) {
      result[p.outcomeKey] = null;
    } else {
      result[p.outcomeKey] = Math.max(1.01, (total / p.totalPool) * houseRatio);
    }
  }
  return result;
}

export function isMarketOpen(market: {
  status: string;
  closesAt: string | Date;
}): boolean {
  if (market.status !== 'OPEN') return false;
  const now = Date.now();
  const closes = new Date(market.closesAt).getTime();
  return now < closes;
}

export const MARKET_LABEL: Record<BettingMarketType, string> = {
  MATCH_EXACT_SCORE: 'Score exact',
  MATCH_TOTAL_GOALS: 'Plus / Moins de buts',
  MATCH_BTTS: 'Les deux équipes marquent',
  TOURNAMENT_TOP_SCORER: 'Meilleur buteur du tournoi',
  TOURNAMENT_MVP: 'MVP du tournoi',
  TOURNAMENT_WINNER: 'Vainqueur du tournoi',
};

export const MARKET_SHORT: Record<BettingMarketType, string> = {
  MATCH_EXACT_SCORE: 'Score',
  MATCH_TOTAL_GOALS: 'Buts',
  MATCH_BTTS: 'BTTS',
  TOURNAMENT_TOP_SCORER: 'Buteur',
  TOURNAMENT_MVP: 'MVP',
  TOURNAMENT_WINNER: 'Vainqueur',
};

/**
 * Pour un marché donné, libellé human-readable de l'outcomeKey.
 * Les pools doivent être déjà résolus côté serveur quand outcomeKey est un id
 * (player/team) — fallback sur la clé brute sinon.
 */
export function describeOutcome(
  type: BettingMarketType,
  outcomeKey: string,
  resolved?: { name?: string; shortName?: string },
): string {
  if (type === 'MATCH_BTTS') {
    return outcomeKey === 'YES' ? 'Oui' : 'Non';
  }
  if (type === 'MATCH_TOTAL_GOALS') {
    return outcomeKey === 'OVER' ? 'Plus de' : 'Moins de';
  }
  if (type === 'MATCH_EXACT_SCORE') {
    return outcomeKey.replace('-', ' – ');
  }
  if (resolved?.shortName) return resolved.shortName;
  if (resolved?.name) return resolved.name;
  return outcomeKey;
}

/**
 * Génère la grille de scores exacts standard pour un match :
 * 0-0, 1-0, 0-1, ..., 4-4 (25 outcomes) + "OTHER".
 * Utilisé à la création d'un marché MATCH_EXACT_SCORE.
 */
export function generateExactScoreOutcomes(maxGoals = 4): string[] {
  const out: string[] = [];
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      out.push(`${h}-${a}`);
    }
  }
  out.push('OTHER');
  return out;
}
