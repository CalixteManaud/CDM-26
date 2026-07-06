// Helpers purs pour les marchés flexibles. NE PAS importer Prisma ni rien
// de server-only ici — ce module est utilisé côté client.

// Limites de mise unitaire sur un marché flexible (points de chaîne Wizebot).
// Client-safe : consommées par les formulaires ET par actions/markets.ts.
export const MIN_MARKET_STAKE = 50;
export const MAX_MARKET_STAKE = 50_000;

// On déclare le type localement pour éviter de dépendre du prisma-client
// dans les bundles client (et casser le build avant `prisma generate`).
export type BettingMarketType =
  | 'MATCH_EXACT_SCORE'
  | 'MATCH_TOTAL_GOALS'
  | 'MATCH_BTTS'
  | 'MATCH_DRAW_NO_BET'
  | 'MATCH_ODD_EVEN'
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
  MATCH_DRAW_NO_BET: 'Vainqueur (nul remboursé)',
  MATCH_ODD_EVEN: 'Nombre de buts pair / impair',
  TOURNAMENT_TOP_SCORER: 'Meilleur buteur du tournoi',
  TOURNAMENT_MVP: 'MVP du tournoi',
  TOURNAMENT_WINNER: 'Vainqueur du tournoi',
};

export const MARKET_SHORT: Record<BettingMarketType, string> = {
  MATCH_EXACT_SCORE: 'Score',
  MATCH_TOTAL_GOALS: 'Buts',
  MATCH_BTTS: 'BTTS',
  MATCH_DRAW_NO_BET: 'DNB',
  MATCH_ODD_EVEN: 'Pair/Impair',
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
  if (type === 'MATCH_ODD_EVEN') {
    return outcomeKey === 'ODD' ? 'Impair' : 'Pair';
  }
  if (type === 'MATCH_DRAW_NO_BET') {
    if (resolved?.shortName) return resolved.shortName;
    return outcomeKey === 'HOME' ? 'Domicile' : 'Extérieur';
  }
  if (type === 'MATCH_EXACT_SCORE') {
    return outcomeKey === 'OTHER' ? 'Autre' : outcomeKey.replace('-', ' – ');
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

/**
 * Ligne standard du marché +/- buts pour un match FIFA (souvent prolifique).
 */
export const DEFAULT_TOTAL_GOALS_LINE = '3.5';

/**
 * Types de marchés "match" qui se règlent automatiquement à partir du seul
 * score final (pas besoin d'events ni de mi-temps). Sert au settlement auto.
 */
export const SCORE_DERIVED_MATCH_TYPES: BettingMarketType[] = [
  'MATCH_EXACT_SCORE',
  'MATCH_TOTAL_GOALS',
  'MATCH_BTTS',
  'MATCH_DRAW_NO_BET',
  'MATCH_ODD_EVEN',
];

/**
 * Catégorie d'affichage d'un marché — sert à grouper les marchés d'un match
 * sous des onglets (Résultat / Buts / Score) côté front.
 */
export type MarketCategory = 'RESULT' | 'GOALS' | 'SCORE' | 'TOURNAMENT';

export const MARKET_CATEGORY: Record<BettingMarketType, MarketCategory> = {
  MATCH_DRAW_NO_BET: 'RESULT',
  MATCH_TOTAL_GOALS: 'GOALS',
  MATCH_BTTS: 'GOALS',
  MATCH_ODD_EVEN: 'GOALS',
  MATCH_EXACT_SCORE: 'SCORE',
  TOURNAMENT_TOP_SCORER: 'TOURNAMENT',
  TOURNAMENT_MVP: 'TOURNAMENT',
  TOURNAMENT_WINNER: 'TOURNAMENT',
};

export const MARKET_CATEGORY_LABEL: Record<MarketCategory, string> = {
  RESULT: 'Résultat',
  GOALS: 'Buts',
  SCORE: 'Score',
  TOURNAMENT: 'Tournoi',
};

/** Ordre d'affichage des onglets de catégorie. */
export const MARKET_CATEGORY_ORDER: MarketCategory[] = ['RESULT', 'GOALS', 'SCORE', 'TOURNAMENT'];

export type MarketResolution =
  | { kind: 'win'; outcomeKey: string }
  | { kind: 'void' };

/**
 * Résout un marché "match" dérivé du score final → outcomeKey gagnant, ou VOID
 * (remboursement) pour les cas comme Draw No Bet sur match nul. Fonction pure
 * (testable, client-safe). Pour MATCH_EXACT_SCORE, renvoie "h-a" ; l'appelant
 * retombe sur "OTHER" si cette clé n'existe pas parmi les pools du marché.
 */
export function resolveMatchMarketOutcome(
  type: BettingMarketType,
  param: string | null,
  homeScore: number,
  awayScore: number,
): MarketResolution {
  const total = homeScore + awayScore;
  switch (type) {
    case 'MATCH_EXACT_SCORE':
      return { kind: 'win', outcomeKey: `${homeScore}-${awayScore}` };
    case 'MATCH_TOTAL_GOALS': {
      const line = Number(param ?? DEFAULT_TOTAL_GOALS_LINE);
      return { kind: 'win', outcomeKey: total > line ? 'OVER' : 'UNDER' };
    }
    case 'MATCH_BTTS':
      return { kind: 'win', outcomeKey: homeScore > 0 && awayScore > 0 ? 'YES' : 'NO' };
    case 'MATCH_ODD_EVEN':
      return { kind: 'win', outcomeKey: total % 2 === 1 ? 'ODD' : 'EVEN' };
    case 'MATCH_DRAW_NO_BET':
      if (homeScore === awayScore) return { kind: 'void' }; // nul → remboursé
      return { kind: 'win', outcomeKey: homeScore > awayScore ? 'HOME' : 'AWAY' };
    default:
      // Types tournoi (top buteur, MVP, vainqueur) : pas réglables au score.
      return { kind: 'void' };
  }
}
