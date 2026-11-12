import { describe, expect, it } from 'vitest';
import type { TipId } from '@cs2/core';
import { SEVERITY_LABEL, TIP_COPY } from './tipCopy';

const ids: TipId[] = ['LOW_KAST', 'UNTRADED_DEATHS', 'LOW_HEADSHOT', 'LOW_DAMAGE', 'HIGH_DAMAGE'];

describe('TIP_COPY', () => {
  it('has a title and a body for every tip id', () => {
    expect(Object.keys(TIP_COPY).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      expect(TIP_COPY[id].title.length).toBeGreaterThan(3);
      expect(TIP_COPY[id].body({}).length).toBeGreaterThan(20);
    }
  });

  it('injects the measured values into the sentence', () => {
    expect(TIP_COPY.LOW_KAST.body({ kast: 0.52 })).toContain('52 %');
    expect(TIP_COPY.UNTRADED_DEATHS.body({ untradedRatio: 0.8, deaths: 10 })).toContain('80 %');
    expect(TIP_COPY.UNTRADED_DEATHS.body({ untradedRatio: 0.8, deaths: 10 })).toContain('10 morts');
    expect(TIP_COPY.LOW_HEADSHOT.body({ hsPercent: 18.4 })).toContain('18 %');
    expect(TIP_COPY.LOW_DAMAGE.body({ adr: 48.6 })).toContain('49 dégâts');
    expect(TIP_COPY.HIGH_DAMAGE.body({ adr: 91 })).toContain('91 dégâts');
  });
});

describe('SEVERITY_LABEL', () => {
  it('labels every severity in words', () => {
    expect(SEVERITY_LABEL).toEqual({
      high: 'Priorité haute',
      medium: 'À améliorer',
      low: 'Détail',
      info: 'Point fort',
    });
  });
});
