import { computeRating, ratingBand } from './rating';
import type { RatingBand } from './rating';
import { computeScoreboard } from './stats';
import type { PlayerStats } from './stats';
import { generateTips } from './tips';
import type { Tip } from './tips';
import type { Plan, ReplayData } from './types';

export class PlayerNotFoundError extends Error {
  constructor(public readonly playerId: string) {
    super(`Player ${playerId} not found in this match`);
    this.name = 'PlayerNotFoundError';
  }
}

/** Complete analysis of one player (what premium users get). */
export interface PlayerReport {
  player: { id: string; name: string };
  stats: PlayerStats;
  rating: number;
  tips: Tip[];
}

export function buildReport(data: ReplayData, playerId: string): PlayerReport {
  const stats = computeScoreboard(data).find((p) => p.id === playerId);
  if (!stats) throw new PlayerNotFoundError(playerId);
  return {
    player: { id: stats.id, name: stats.name },
    stats,
    rating: computeRating(stats),
    tips: generateTips(stats),
  };
}

export type PremiumFeature = 'rating_detail' | 'kast' | 'tips' | 'heatmaps' | 'utility';

export const PREMIUM_FEATURES: readonly PremiumFeature[] = [
  'rating_detail',
  'kast',
  'tips',
  'heatmaps',
  'utility',
];

/** What a given plan is allowed to see. Locked values are `null`, never leaked. */
export interface GatedReport {
  plan: Plan;
  player: { id: string; name: string };
  basic: Pick<PlayerStats, 'rounds' | 'kills' | 'deaths' | 'assists' | 'kd' | 'adr' | 'hsPercent'>;
  rating: { band: RatingBand; value: number | null };
  kast: number | null;
  tips: Tip[];
  hiddenTipCount: number;
  lockedFeatures: PremiumFeature[];
}

export function gateReport(report: PlayerReport, plan: Plan): GatedReport {
  const { stats } = report;
  const basic = {
    rounds: stats.rounds,
    kills: stats.kills,
    deaths: stats.deaths,
    assists: stats.assists,
    kd: stats.kd,
    adr: stats.adr,
    hsPercent: stats.hsPercent,
  };
  const band = ratingBand(report.rating);

  if (plan === 'premium') {
    return {
      plan,
      player: report.player,
      basic,
      rating: { band, value: report.rating },
      kast: stats.kast,
      tips: report.tips,
      hiddenTipCount: 0,
      lockedFeatures: [],
    };
  }

  return {
    plan,
    player: report.player,
    basic,
    rating: { band, value: null },
    kast: null,
    tips: report.tips.slice(0, 1),
    hiddenTipCount: Math.max(report.tips.length - 1, 0),
    lockedFeatures: [...PREMIUM_FEATURES],
  };
}
