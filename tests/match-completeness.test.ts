import { describe, it, expect } from 'vitest';
import {
  analyzeMatchCompleteness,
  worstSeverity,
  type CompletenessInput,
} from '@/lib/utils/match-completeness';

const base: CompletenessInput = {
  status: 'FINISHED',
  homeScore: 0,
  awayScore: 0,
  homeTeamId: 'H',
  awayTeamId: 'A',
  homePlayerIds: ['h1', 'h2'],
  awayPlayerIds: ['a1', 'a2'],
  playerStats: [],
  events: [],
};

const codes = (i: CompletenessInput) => analyzeMatchCompleteness(i).map((x) => x.code);

describe('analyzeMatchCompleteness', () => {
  it('ignore les matchs non terminés', () => {
    expect(analyzeMatchCompleteness({ ...base, status: 'LIVE', homeScore: null, awayScore: null })).toEqual([]);
  });

  it('détecte un score manquant (critique) et n\'ajoute rien d\'autre', () => {
    const issues = analyzeMatchCompleteness({ ...base, homeScore: null, awayScore: null });
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('MISSING_SCORE');
    expect(issues[0].severity).toBe('critical');
  });

  it('0-0 sans stats : aucun problème', () => {
    expect(codes(base)).toEqual([]);
  });

  it('score > 0 sans aucun buteur → NO_SCORERS', () => {
    expect(codes({ ...base, homeScore: 2, awayScore: 1 })).toContain('NO_SCORERS');
  });

  it('buteurs cohérents avec le score → aucun problème', () => {
    const issues = codes({
      ...base,
      homeScore: 2,
      awayScore: 1,
      playerStats: [
        { playerId: 'h1', goals: 2, yellowCards: 0, redCards: 0 },
        { playerId: 'a1', goals: 1, yellowCards: 0, redCards: 0 },
      ],
    });
    expect(issues).toEqual([]);
  });

  it('somme des buts ≠ score → GOALS_MISMATCH', () => {
    expect(
      codes({
        ...base,
        homeScore: 3,
        awayScore: 1,
        playerStats: [
          { playerId: 'h1', goals: 2, yellowCards: 0, redCards: 0 },
          { playerId: 'a1', goals: 1, yellowCards: 0, redCards: 0 },
        ],
      })
    ).toContain('GOALS_MISMATCH');
  });

  it('CSC loggé explique l\'écart → pas de GOALS_MISMATCH', () => {
    // 1-0 : aucun buteur home, mais un OWN_GOAL contre away crédite le home.
    const issues = codes({
      ...base,
      homeScore: 1,
      awayScore: 0,
      playerStats: [{ playerId: 'a1', goals: 0, yellowCards: 0, redCards: 0 }],
      events: [{ type: 'OWN_GOAL', teamId: 'A' }],
    });
    expect(issues).not.toContain('GOALS_MISMATCH');
  });

  it('cartons live ≠ stats → CARDS_MISMATCH', () => {
    expect(
      codes({
        ...base,
        homeScore: 0,
        awayScore: 0,
        events: [
          { type: 'YELLOW_CARD', teamId: 'H' },
          { type: 'YELLOW_CARD', teamId: 'A' },
        ],
        playerStats: [{ playerId: 'h1', goals: 0, yellowCards: 1, redCards: 0 }],
      })
    ).toContain('CARDS_MISMATCH');
  });
});

describe('worstSeverity', () => {
  it('retourne la plus haute gravité', () => {
    const issues = analyzeMatchCompleteness({ ...base, homeScore: null, awayScore: null });
    expect(worstSeverity(issues)).toBe('critical');
  });
  it('null si aucune anomalie', () => {
    expect(worstSeverity([])).toBeNull();
  });
});
