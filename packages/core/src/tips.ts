import type { PlayerStats } from './stats';

export type TipSeverity = 'high' | 'medium' | 'low' | 'info';

export type TipId = 'LOW_KAST' | 'UNTRADED_DEATHS' | 'LOW_HEADSHOT' | 'LOW_DAMAGE' | 'HIGH_DAMAGE';

/**
 * Language-neutral coaching tip: the UI maps `id` to a localised sentence and fills it
 * with `metrics`.
 */
export interface Tip {
  id: TipId;
  severity: TipSeverity;
  metrics: Record<string, number>;
}

/** Below this many rounds the sample is too small to give advice. */
export const MIN_ROUNDS_FOR_TIPS = 8;

const SEVERITY_ORDER: Record<TipSeverity, number> = { high: 0, medium: 1, low: 2, info: 3 };

/** Rule-based coaching tips for one player, most important first. */
export function generateTips(stats: PlayerStats): Tip[] {
  if (stats.rounds < MIN_ROUNDS_FOR_TIPS) return [];
  const tips: Tip[] = [];

  if (stats.kast < 0.6) {
    tips.push({
      id: 'LOW_KAST',
      severity: stats.kast < 0.5 ? 'high' : 'medium',
      metrics: { kast: stats.kast },
    });
  }

  if (stats.deaths >= 5) {
    const untradedRatio = (stats.deaths - stats.tradedDeaths) / stats.deaths;
    if (untradedRatio > 0.7) {
      tips.push({
        id: 'UNTRADED_DEATHS',
        severity: untradedRatio > 0.85 ? 'high' : 'medium',
        metrics: { untradedRatio, deaths: stats.deaths },
      });
    }
  }

  if (stats.kills >= 8 && stats.hsPercent < 25) {
    tips.push({ id: 'LOW_HEADSHOT', severity: 'low', metrics: { hsPercent: stats.hsPercent } });
  }

  if (stats.adr < 55) {
    tips.push({ id: 'LOW_DAMAGE', severity: 'medium', metrics: { adr: stats.adr } });
  } else if (stats.adr >= 85) {
    tips.push({ id: 'HIGH_DAMAGE', severity: 'info', metrics: { adr: stats.adr } });
  }

  return tips.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.id.localeCompare(b.id),
  );
}
