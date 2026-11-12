import { generateSampleReplay, worldToMap } from '@cs2/core';
import type { KillEvent, ReplayData } from '@cs2/core';
import { describe, expect, it } from 'vitest';
import {
  aliveCounts,
  createCalibration,
  getBackdrop,
  recentKillFeed,
  viewBounds,
  visibleKills,
} from './replayView';

const kill = (t: number, victimId = 'v'): KillEvent => ({
  t,
  killerId: 'k',
  victimId,
  assisterId: null,
  weapon: 'ak47',
  headshot: false,
});

describe('getBackdrop / viewBounds', () => {
  const sample = generateSampleReplay();

  it('only knows the fictional sample arena', () => {
    expect(getBackdrop('sample_arena')?.walls.length).toBeGreaterThan(0);
    expect(getBackdrop('de_mirage')).toBeNull();
  });

  it('uses the backdrop bounds for the sample arena', () => {
    expect(viewBounds(sample)).toEqual({ minX: 0, minY: 0, maxX: 2000, maxY: 1400 });
  });

  it('derives the bounds from the player positions (with a margin) for other maps', () => {
    const replay: ReplayData = {
      ...sample,
      map: 'de_unknown',
      rounds: [
        {
          ...sample.rounds[0]!,
          frames: [
            {
              t: 0,
              players: [
                { id: 'a', x: 100, y: 200, z: 0, yaw: 0, hp: 100, team: 'CT' },
                { id: 'b', x: 1100, y: 700, z: 0, yaw: 0, hp: 100, team: 'T' },
              ],
            },
          ],
        },
      ],
    };
    const bounds = viewBounds(replay);
    expect(bounds.minX).toBeLessThan(100);
    expect(bounds.maxX).toBeGreaterThan(1100);
    expect(bounds.minY).toBeLessThan(200);
    expect(bounds.maxY).toBeGreaterThan(700);
  });

  it('falls back to a unit box when there are no positions', () => {
    expect(viewBounds({ ...sample, map: 'de_empty', rounds: [] })).toEqual({
      minX: 0,
      minY: 0,
      maxX: 1,
      maxY: 1,
    });
  });
});

describe('createCalibration', () => {
  it('fits the whole sample arena inside the padded viewport', () => {
    const cal = createCalibration(generateSampleReplay(), { width: 960, height: 600 }, 24);
    for (const [x, y] of [
      [0, 0],
      [2000, 0],
      [0, 1400],
      [2000, 1400],
    ] as const) {
      const p = worldToMap({ x, y }, cal);
      expect(p.x).toBeGreaterThanOrEqual(24 - 1e-6);
      expect(p.x).toBeLessThanOrEqual(936 + 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(24 - 1e-6);
      expect(p.y).toBeLessThanOrEqual(576 + 1e-6);
    }
  });
});

describe('visibleKills', () => {
  const kills = [kill(5), kill(10), kill(10.5)];

  it('returns kills inside the time window with a fade progress', () => {
    const visible = visibleKills(kills, 10.75, 1.5);
    expect(visible.map((v) => v.kill.t)).toEqual([10, 10.5]);
    expect(visible[0]!.progress).toBeCloseTo(0.5);
    expect(visible[1]!.progress).toBeCloseTo(1 / 6);
  });

  it('ignores kills in the future and kills that already faded', () => {
    expect(visibleKills(kills, 4)).toEqual([]);
    expect(visibleKills(kills, 20)).toEqual([]);
  });
});

describe('recentKillFeed', () => {
  const kills = [1, 2, 3, 4, 5, 6, 7].map((t) => kill(t));

  it('returns the latest kills up to the current time, oldest first', () => {
    expect(recentKillFeed(kills, 6.5).map((k) => k.t)).toEqual([2, 3, 4, 5, 6]);
    expect(recentKillFeed(kills, 6.5, 2).map((k) => k.t)).toEqual([5, 6]);
  });

  it('is empty before the first kill', () => {
    expect(recentKillFeed(kills, 0.5)).toEqual([]);
  });
});

describe('aliveCounts', () => {
  it('counts living players per team', () => {
    const frame = generateSampleReplay().rounds[0]!.frames[0]!;
    expect(aliveCounts(frame)).toEqual({ CT: 5, T: 5 });
    const late = generateSampleReplay().rounds[0]!.frames.at(-1)!;
    expect(aliveCounts(late)).toEqual({ CT: 3, T: 0 });
  });

  it('handles a missing frame', () => {
    expect(aliveCounts(null)).toEqual({ CT: 0, T: 0 });
  });
});
