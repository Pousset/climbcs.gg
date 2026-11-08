import { describe, expect, it } from 'vitest';
import { computeRating, RATING_BASELINE, RATING_MAX, RATING_WEIGHTS, ratingBand } from './rating';

const average = { rounds: 100, kills: 70, deaths: 68, adr: 75, kast: 0.72 };

describe('computeRating', () => {
  it('weights sum to one', () => {
    const total = Object.values(RATING_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1);
  });

  it('gives 1.00 to an average player', () => {
    expect(computeRating(average)).toBe(1);
    expect(RATING_BASELINE.kpr).toBe(0.7);
  });

  it('increases with kills and ADR', () => {
    expect(computeRating({ ...average, kills: 100 })).toBeGreaterThan(1);
    expect(computeRating({ ...average, adr: 100 })).toBeGreaterThan(1);
  });

  it('decreases with more deaths and a lower KAST', () => {
    expect(computeRating({ ...average, deaths: 90 })).toBeLessThan(1);
    expect(computeRating({ ...average, kast: 0.5 })).toBeLessThan(1);
  });

  it('returns 0 when no rounds were played', () => {
    expect(computeRating({ ...average, rounds: 0 })).toBe(0);
  });

  it('never goes below 0 or above the maximum', () => {
    expect(computeRating({ rounds: 10, kills: 0, deaths: 10, adr: 0, kast: 0 })).toBe(0);
    expect(computeRating({ rounds: 10, kills: 100, deaths: 0, adr: 500, kast: 1 })).toBe(
      RATING_MAX,
    );
  });

  it('rounds to two decimals', () => {
    const r = computeRating({ rounds: 13, kills: 11, deaths: 9, adr: 82.3, kast: 0.69 });
    expect(Math.round(r * 100)).toBeCloseTo(r * 100);
  });
});

describe('ratingBand', () => {
  it('classifies ratings around the average', () => {
    expect(ratingBand(0.89)).toBe('below');
    expect(ratingBand(0.9)).toBe('average');
    expect(ratingBand(1.1)).toBe('average');
    expect(ratingBand(1.11)).toBe('above');
  });
});
