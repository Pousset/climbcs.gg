import { buildReport, gateReport, generateSampleReplay, SAMPLE_PLAYER_ID } from '@cs2/core';
import type { GatedReport } from '@cs2/core';

/**
 * Illustrative report for the landing page, as a free account would see it.
 * Tips are hand-written examples (the 3-round sample is too short to trigger any rule).
 */
export function createLandingReport(): GatedReport {
  const report = buildReport(generateSampleReplay(), SAMPLE_PLAYER_ID);
  return gateReport(
    {
      ...report,
      rating: 1.18,
      stats: { ...report.stats, kast: 0.68 },
      tips: [
        { id: 'UNTRADED_DEATHS', severity: 'high', metrics: { untradedRatio: 0.78, deaths: 9 } },
        { id: 'LOW_HEADSHOT', severity: 'low', metrics: { hsPercent: 19 } },
        { id: 'HIGH_DAMAGE', severity: 'info', metrics: { adr: 86 } },
      ],
    },
    'free',
  );
}
