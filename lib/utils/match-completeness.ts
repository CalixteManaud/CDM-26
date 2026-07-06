/**
 * Détection des matchs `FINISHED` incomplets (score, buteurs, cartons).
 *
 * Fonction PURE (aucune dépendance Prisma / Clerk) → utilisable côté serveur
 * (getServerSideProps de la page de révision) comme côté client (badges).
 *
 * Les anomalies sont TOUTES dérivées des données existantes — pas de flag
 * manuel à cocher. On croise : score du match, MatchPlayerStats (buts/cartons)
 * et MatchEvent (OWN_GOAL pour expliquer les écarts, cartons live).
 */

export type MatchIssueCode = 'MISSING_SCORE' | 'GOALS_MISMATCH' | 'NO_SCORERS' | 'CARDS_MISMATCH';
export type MatchIssueSeverity = 'critical' | 'warning' | 'info';

export type MatchIssue = {
  code: MatchIssueCode;
  severity: MatchIssueSeverity;
  label: string;
  detail: string;
};

export type CompletenessInput = {
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeamId: string;
  awayTeamId: string;
  /** IDs des joueurs de chaque équipe (pour rattacher les stats). */
  homePlayerIds: string[];
  awayPlayerIds: string[];
  playerStats: { playerId: string; goals: number; yellowCards: number; redCards: number }[];
  events: { type: string; teamId: string | null }[];
};

const SEVERITY_RANK: Record<MatchIssueSeverity, number> = { critical: 0, warning: 1, info: 2 };

/** Sévérité la plus haute d'une liste d'anomalies (pour le tri / le badge global). */
export function worstSeverity(issues: MatchIssue[]): MatchIssueSeverity | null {
  if (issues.length === 0) return null;
  return issues.reduce<MatchIssueSeverity>(
    (worst, i) => (SEVERITY_RANK[i.severity] < SEVERITY_RANK[worst] ? i.severity : worst),
    'info'
  );
}

/** Ordre de tri : critiques d'abord. */
export function severityRank(s: MatchIssueSeverity): number {
  return SEVERITY_RANK[s];
}

/**
 * Analyse un match et retourne la liste de ses anomalies (vide si complet ou
 * pas encore `FINISHED`).
 */
export function analyzeMatchCompleteness(m: CompletenessInput): MatchIssue[] {
  const issues: MatchIssue[] = [];

  // On ne juge que les matchs validés.
  if (m.status !== 'FINISHED') return issues;

  // 1) Score manquant — bloque standings/stats et le settlement des paris.
  if (m.homeScore === null || m.awayScore === null) {
    issues.push({
      code: 'MISSING_SCORE',
      severity: 'critical',
      label: 'Score manquant',
      detail:
        'Match marqué terminé sans score : ignoré par le classement et les stats, et les paris n’ont pas été réglés.',
    });
    // Sans score, les contrôles suivants (dérivés du score) n'ont pas de sens.
    return issues;
  }

  const homeScore = m.homeScore;
  const awayScore = m.awayScore;
  const totalScore = homeScore + awayScore;

  const homeSet = new Set(m.homePlayerIds);
  const awaySet = new Set(m.awayPlayerIds);

  let homeScorerGoals = 0;
  let awayScorerGoals = 0;
  let totalGoalsStat = 0;
  let statYellow = 0;
  let statRed = 0;
  for (const s of m.playerStats) {
    totalGoalsStat += s.goals;
    statYellow += s.yellowCards;
    statRed += s.redCards;
    if (homeSet.has(s.playerId)) homeScorerGoals += s.goals;
    else if (awaySet.has(s.playerId)) awayScorerGoals += s.goals;
  }

  // CSC : un OWN_GOAL loggé contre une équipe crédite le score de l'adverse.
  let ownGoalCreditHome = 0;
  let ownGoalCreditAway = 0;
  let eventYellow = 0;
  let eventRed = 0;
  for (const e of m.events) {
    if (e.type === 'OWN_GOAL') {
      if (e.teamId === m.awayTeamId) ownGoalCreditHome += 1;
      else if (e.teamId === m.homeTeamId) ownGoalCreditAway += 1;
    } else if (e.type === 'YELLOW_CARD') eventYellow += 1;
    else if (e.type === 'RED_CARD') eventRed += 1;
  }

  // 2) Aucun buteur alors qu'il y a eu des buts (top buteur / stats faussés).
  //    Prioritaire sur le mismatch pour éviter le double-flag.
  if (totalScore > 0 && totalGoalsStat === 0) {
    issues.push({
      code: 'NO_SCORERS',
      severity: 'info',
      label: 'Aucun buteur renseigné',
      detail: `Score ${homeScore}–${awayScore} mais aucune stat joueur : classement des équipes OK, mais top buteur et stats individuelles vides.`,
    });
  } else {
    // 3) Somme des buts joueurs (+ CSC) ≠ score.
    const homeExpected = homeScorerGoals + ownGoalCreditHome;
    const awayExpected = awayScorerGoals + ownGoalCreditAway;
    if (homeExpected !== homeScore || awayExpected !== awayScore) {
      issues.push({
        code: 'GOALS_MISMATCH',
        severity: 'warning',
        label: 'Buteurs incohérents',
        detail: `Buts attribués ${homeExpected}–${awayExpected} (dont CSC ${ownGoalCreditHome}–${ownGoalCreditAway}) ≠ score ${homeScore}–${awayScore} : buteur oublié ou CSC non loggé.`,
      });
    }
  }

  // 4) Cartons loggés en live mais pas reportés dans les stats (ou l'inverse).
  //    Seulement si des cartons ont été loggés en live (sinon rien à comparer).
  if ((eventYellow > 0 || eventRed > 0) && (eventYellow !== statYellow || eventRed !== statRed)) {
    issues.push({
      code: 'CARDS_MISMATCH',
      severity: 'info',
      label: 'Cartons incohérents',
      detail: `Cartons live 🟨${eventYellow} 🟥${eventRed} ≠ stats 🟨${statYellow} 🟥${statRed}.`,
    });
  }

  return issues;
}
