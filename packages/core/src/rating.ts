import type { PlayerStats } from './stats';

/** Per-round values of an average player; each component is normalised against these. */
export const RATING_BASELINE = { kpr: 0.7, adr: 75, kast: 0.72, survival: 0.32 } as const;

/** Weight of each component in the final rating (sums to 1). */
export const RATING_WEIGHTS = { kills: 0.3, adr: 0.25, kast: 0.25, survival: 0.2 } as const;

export const RATING_MAX = 3;

export type RatingBand = 'below' | 'average' | 'above';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * House rating where 1.00 is an average player. Weighted blend of kills per round, ADR, KAST
 * and survival rate, rounded to two decimals and clamped to [0, 3].
 * V1 formula: the baselines are first estimates and will be calibrated on real data.
 */
export function computeRating(
  stats: Pick<PlayerStats, 'rounds' | 'kills' | 'deaths' | 'adr' | 'kast'>,
): number {
  if (stats.rounds <= 0) return 0;
  const kpr = stats.kills / stats.rounds;
  const survival = clamp(1 - stats.deaths / stats.rounds, 0, 1);
  const raw =
    RATING_WEIGHTS.kills * (kpr / RATING_BASELINE.kpr) +
    RATING_WEIGHTS.adr * (stats.adr / RATING_BASELINE.adr) +
    RATING_WEIGHTS.kast * (stats.kast / RATING_BASELINE.kast) +
    RATING_WEIGHTS.survival * (survival / RATING_BASELINE.survival);
  return Math.round(clamp(raw, 0, RATING_MAX) * 100) / 100;
}

/** Coarse bucket shown to free users instead of the exact value. */
export function ratingBand(rating: number): RatingBand {
  if (rating < 0.9) return 'below';
  if (rating > 1.1) return 'above';
  return 'average';
}
