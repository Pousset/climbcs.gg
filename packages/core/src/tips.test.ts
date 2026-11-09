import { describe, expect, it } from 'vitest';
import { generateTips, MIN_ROUNDS_FOR_TIPS } from './tips';
import type { PlayerStats } from './stats';

const solid: PlayerStats = {
  id: 'p',
  name: 'P',
  rounds: 20,
  kills: 15,
  deaths: 12,
  assists: 3,
  headshots: 6,
  damage: 1500,
  tradedDeaths: 6,
  kastRounds: 15,
  kd: 1.25,
  hsPercent: 40,
  adr: 75,
  kast: 0.75,
};

const ids = (stats: PlayerStats) => generateTips(stats).map((t) => t.id);

describe('generateTips', () => {
  it('gives nothing for a solid performance', () => {
    expect(generateTips(solid)).toEqual([]);
  });

  it('gives nothing when too few rounds were played', () => {
    const tiny = { ...solid, rounds: MIN_ROUNDS_FOR_TIPS - 1, kast: 0.1, adr: 10 };
    expect(generateTips(tiny)).toEqual([]);
  });

  it('flags a low KAST with a severity that depends on how low it is', () => {
    expect(generateTips({ ...solid, kast: 0.55 })[0]).toMatchObject({
      id: 'LOW_KAST',
      severity: 'medium',
    });
    expect(generateTips({ ...solid, kast: 0.4 })[0]).toMatchObject({
      id: 'LOW_KAST',
      severity: 'high',
    });
    expect(ids({ ...solid, kast: 0.6 })).not.toContain('LOW_KAST');
  });

  it('flags untraded deaths only with enough deaths and a high untraded ratio', () => {
    expect(ids({ ...solid, deaths: 10, tradedDeaths: 2 })).toContain('UNTRADED_DEATHS');
    expect(ids({ ...solid, deaths: 4, tradedDeaths: 0 })).not.toContain('UNTRADED_DEATHS');
    expect(ids({ ...solid, deaths: 10, tradedDeaths: 5 })).not.toContain('UNTRADED_DEATHS');
    const severe = generateTips({ ...solid, deaths: 10, tradedDeaths: 1 });
    expect(severe.find((t) => t.id === 'UNTRADED_DEATHS')?.severity).toBe('high');
  });

  it('flags a low headshot rate only with enough kills', () => {
    expect(ids({ ...solid, kills: 12, hsPercent: 10 })).toContain('LOW_HEADSHOT');
    expect(ids({ ...solid, kills: 3, hsPercent: 0 })).not.toContain('LOW_HEADSHOT');
  });

  it('flags low damage and celebrates high damage', () => {
    expect(ids({ ...solid, adr: 50 })).toContain('LOW_DAMAGE');
    const high = generateTips({ ...solid, adr: 90 });
    expect(high).toEqual([{ id: 'HIGH_DAMAGE', severity: 'info', metrics: { adr: 90 } }]);
  });

  it('sorts tips by severity then id', () => {
    const tips = generateTips({ ...solid, kast: 0.4, adr: 50, kills: 12, hsPercent: 10 });
    expect(tips.map((t) => t.severity)).toEqual(['high', 'medium', 'low']);
  });

  it('exposes the measured values as metrics', () => {
    const [tip] = generateTips({ ...solid, kast: 0.45 });
    expect(tip?.metrics).toEqual({ kast: 0.45 });
  });
});
