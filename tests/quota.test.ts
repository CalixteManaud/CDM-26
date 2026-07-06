import { describe, it, expect } from 'vitest';
import {
  DAILY_POINT_QUOTA,
  PER_MATCH_POINT_QUOTA,
  QUOTA_TIMEZONE,
  quotaDayStart,
} from '@/lib/utils/quota';

describe('constantes de quota', () => {
  it('quota journalier ≥ quota par match (sinon un match plein sature la journée)', () => {
    expect(DAILY_POINT_QUOTA).toBeGreaterThanOrEqual(PER_MATCH_POINT_QUOTA);
  });

  it('valeurs positives', () => {
    expect(DAILY_POINT_QUOTA).toBeGreaterThan(0);
    expect(PER_MATCH_POINT_QUOTA).toBeGreaterThan(0);
  });
});

describe('quotaDayStart', () => {
  it('renvoie un instant dans le passé (minuit du jour courant)', () => {
    const start = quotaDayStart();
    expect(start.getTime()).toBeLessThanOrEqual(Date.now());
    // Moins de 24h dans le passé.
    expect(Date.now() - start.getTime()).toBeLessThan(24 * 3600 * 1000 + 1000);
  });

  it('correspond bien à 00h00 heure de Paris', () => {
    const start = quotaDayStart(new Date('2026-07-06T15:30:00Z'));
    const hourParis = new Intl.DateTimeFormat('en-US', {
      timeZone: QUOTA_TIMEZONE,
      hour: '2-digit',
      hour12: false,
    }).format(start);
    // minuit Paris → "00" (certains runtimes renvoient "24")
    expect(['00', '24']).toContain(hourParis);
  });
});
