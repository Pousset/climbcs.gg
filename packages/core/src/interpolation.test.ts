import { describe, expect, it } from 'vitest';
import { interpolateFrame, interpolatePlayer, lerp, lerpAngle } from './interpolation';
import type { Frame, PlayerSample } from './types';

const player = (id: string, x: number, y: number, yaw = 0, hp = 100): PlayerSample => ({
  id,
  x,
  y,
  z: 0,
  yaw,
  hp,
  team: 'CT',
});

describe('lerp', () => {
  it('returns the bounds at k=0 and k=1 and the middle at k=0.5', () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
    expect(lerp(10, 20, 0.5)).toBe(15);
  });
});

describe('lerpAngle', () => {
  it('interpolates normally when no wrap is needed', () => {
    expect(lerpAngle(10, 50, 0.5)).toBeCloseTo(30);
  });

  it('takes the shortest arc across 0/360', () => {
    expect(lerpAngle(350, 10, 0.5)).toBeCloseTo(0);
    expect(lerpAngle(10, 350, 0.5)).toBeCloseTo(0);
  });

  it('always returns a value in [0, 360)', () => {
    const v = lerpAngle(5, 355, 0.75);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(360);
  });

  it('normalises negative inputs', () => {
    expect(lerpAngle(-90, -90, 0.5)).toBeCloseTo(270);
  });
});

describe('interpolatePlayer', () => {
  it('interpolates position and yaw but keeps identity and hp from the first sample', () => {
    const a = player('p1', 0, 0, 0, 100);
    const b = { ...player('p1', 10, 20, 90, 40), z: 8 };
    const mid = interpolatePlayer(a, b, 0.5);
    expect(mid).toMatchObject({ id: 'p1', x: 5, y: 10, z: 4, hp: 100, team: 'CT' });
    expect(mid.yaw).toBeCloseTo(45);
  });
});

describe('interpolateFrame', () => {
  const frames: Frame[] = [
    { t: 0, players: [player('a', 0, 0), player('b', 100, 100)] },
    { t: 1, players: [player('a', 10, 0), player('b', 100, 100, 0, 0)] },
    { t: 3, players: [player('a', 30, 0)] },
  ];

  it('returns null for an empty timeline', () => {
    expect(interpolateFrame([], 1)).toBeNull();
  });

  it('clamps before the first and after the last frame', () => {
    expect(interpolateFrame(frames, -5)).toBe(frames[0]);
    expect(interpolateFrame(frames, 99)).toBe(frames[2]);
  });

  it('returns an exact frame when t matches its timestamp', () => {
    expect(interpolateFrame(frames, 1)?.players[0]?.x).toBe(10);
  });

  it('interpolates between the two surrounding frames', () => {
    const f = interpolateFrame(frames, 0.5)!;
    expect(f.t).toBe(0.5);
    expect(f.players.find((p) => p.id === 'a')?.x).toBe(5);
  });

  it('uses the right segment when frames are unevenly spaced', () => {
    const f = interpolateFrame(frames, 2)!;
    expect(f.players[0]?.x).toBe(20);
  });

  it('keeps the last known state of a player missing from the next frame', () => {
    const f = interpolateFrame(frames, 2)!;
    expect(f.players.find((p) => p.id === 'b')).toEqual(frames[1]!.players[1]);
  });
});
