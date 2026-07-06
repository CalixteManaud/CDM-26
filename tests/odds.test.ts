import { describe, it, expect } from 'vitest';
import { computeLiveOdds, isBettingOpen, bettingPhase } from '@/lib/utils/odds';

describe('computeLiveOdds', () => {
  it('renvoie null partout si le pool est vide', () => {
    expect(computeLiveOdds({ totalHomePool: 0, totalDrawPool: 0, totalAwayPool: 0, housePercentage: 0 })).toEqual({
      home: null,
      draw: null,
      away: null,
    });
  });

  it('calcule la cote pari mutuel sans marge maison', () => {
    const odds = computeLiveOdds({ totalHomePool: 100, totalDrawPool: 0, totalAwayPool: 100, housePercentage: 0 });
    // total 200 → 200/100 = 2 pour home et away, draw personne → null
    expect(odds.home).toBe(2);
    expect(odds.away).toBe(2);
    expect(odds.draw).toBeNull();
  });

  it('applique la marge maison', () => {
    const odds = computeLiveOdds({ totalHomePool: 100, totalDrawPool: 0, totalAwayPool: 100, housePercentage: 5 });
    // 2 * 0.95 = 1.9
    expect(odds.home).toBeCloseTo(1.9, 5);
    expect(odds.away).toBeCloseTo(1.9, 5);
  });

  it('accepte housePercentage sous forme de Decimal (toString)', () => {
    const odds = computeLiveOdds({
      totalHomePool: 300,
      totalDrawPool: 100,
      totalAwayPool: 100,
      housePercentage: { toString: () => '10' },
    });
    // total 500 → home 500/300*0.9 = 1.5
    expect(odds.home).toBeCloseTo(1.5, 3);
  });
});

describe('isBettingOpen', () => {
  const future = new Date(Date.now() + 3_600_000);
  const past = new Date(Date.now() - 3_600_000);

  it('ouvert si SCHEDULED et avant le coup d\'envoi', () => {
    expect(isBettingOpen({ status: 'SCHEDULED', matchDate: future })).toBe(true);
  });

  it('fermé si SCHEDULED mais horaire dépassé', () => {
    expect(isBettingOpen({ status: 'SCHEDULED', matchDate: past })).toBe(false);
  });

  it('fermé dès que le match est LIVE', () => {
    expect(isBettingOpen({ status: 'LIVE', matchDate: future })).toBe(false);
  });

  it('fermé si FINISHED', () => {
    expect(isBettingOpen({ status: 'FINISHED', matchDate: past })).toBe(false);
  });
});

describe('bettingPhase', () => {
  const future = new Date(Date.now() + 3_600_000);
  const past = new Date(Date.now() - 3_600_000);

  it('PRE avant le coup d\'envoi', () => {
    expect(bettingPhase({ status: 'SCHEDULED', matchDate: future })).toBe('PRE');
  });
  it('LIVE quand le match est lancé', () => {
    expect(bettingPhase({ status: 'LIVE', matchDate: past })).toBe('LIVE');
  });
  it('CLOSED quand terminé', () => {
    expect(bettingPhase({ status: 'FINISHED', matchDate: past })).toBe('CLOSED');
  });
  it('CLOSED si SCHEDULED mais horaire dépassé sans lancement', () => {
    expect(bettingPhase({ status: 'SCHEDULED', matchDate: past })).toBe('CLOSED');
  });
});
