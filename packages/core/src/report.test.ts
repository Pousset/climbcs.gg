import { describe, expect, it } from 'vitest';
import { buildReport, gateReport, PlayerNotFoundError, PREMIUM_FEATURES } from './report';
import type { PlayerReport } from './report';
import { generateSampleReplay, SAMPLE_PLAYER_ID } from './sample';

const data = generateSampleReplay();

describe('buildReport', () => {
  it('assembles stats, rating and tips for a player', () => {
    const report = buildReport(data, SAMPLE_PLAYER_ID);
    expect(report.player).toEqual({ id: SAMPLE_PLAYER_ID, name: 'Aegis' });
    expect(report.stats.rounds).toBe(3);
    expect(report.rating).toBeGreaterThan(0);
    expect(report.tips).toEqual([]);
  });

  it('throws a typed error for an unknown player', () => {
    expect(() => buildReport(data, 'nobody')).toThrow(PlayerNotFoundError);
    try {
      buildReport(data, 'nobody');
    } catch (error) {
      expect((error as PlayerNotFoundError).playerId).toBe('nobody');
    }
  });
});

describe('gateReport', () => {
  const base = buildReport(data, SAMPLE_PLAYER_ID);
  const report: PlayerReport = {
    ...base,
    rating: 1.23,
    tips: [
      { id: 'LOW_KAST', severity: 'high', metrics: { kast: 0.4 } },
      { id: 'LOW_DAMAGE', severity: 'medium', metrics: { adr: 50 } },
      { id: 'LOW_HEADSHOT', severity: 'low', metrics: { hsPercent: 10 } },
    ],
  };

  it('hides the exact rating, KAST and extra tips from free users', () => {
    const free = gateReport(report, 'free');
    expect(free.plan).toBe('free');
    expect(free.rating).toEqual({ band: 'above', value: null });
    expect(free.kast).toBeNull();
    expect(free.tips).toEqual([report.tips[0]]);
    expect(free.hiddenTipCount).toBe(2);
    expect(free.lockedFeatures).toEqual([...PREMIUM_FEATURES]);
  });

  it('keeps basic statistics visible for free users', () => {
    const free = gateReport(report, 'free');
    expect(free.basic).toMatchObject({ kills: base.stats.kills, adr: base.stats.adr });
  });

  it('does not leak locked values anywhere in the free payload', () => {
    const json = JSON.stringify(gateReport(report, 'free'));
    expect(json).not.toContain('1.23');
    expect(json).not.toContain('LOW_DAMAGE');
  });

  it('reveals everything to premium users', () => {
    const premium = gateReport(report, 'premium');
    expect(premium.rating).toEqual({ band: 'above', value: 1.23 });
    expect(premium.kast).toBe(base.stats.kast);
    expect(premium.tips).toHaveLength(3);
    expect(premium.hiddenTipCount).toBe(0);
    expect(premium.lockedFeatures).toEqual([]);
  });

  it('handles a report without tips', () => {
    const free = gateReport({ ...report, tips: [] }, 'free');
    expect(free.tips).toEqual([]);
    expect(free.hiddenTipCount).toBe(0);
  });
});
