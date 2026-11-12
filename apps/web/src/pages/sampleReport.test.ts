import { describe, expect, it } from 'vitest';
import { createLandingReport } from './sampleReport';

describe('createLandingReport', () => {
  const report = createLandingReport();

  it('is a free-plan report for the sample player', () => {
    expect(report.plan).toBe('free');
    expect(report.player.name).toBe('Aegis');
  });

  it('teases the premium values instead of exposing them', () => {
    expect(report.rating).toEqual({ band: 'above', value: null });
    expect(report.kast).toBeNull();
    expect(report.hiddenTipCount).toBe(2);
    expect(report.tips).toHaveLength(1);
    expect(report.tips[0]?.id).toBe('UNTRADED_DEATHS');
  });
});
