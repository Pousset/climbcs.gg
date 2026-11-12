import { worldToMap } from '@cs2/core';
import type { Frame, PlayerSample } from '@cs2/core';
import { describe, expect, it } from 'vitest';
import { createRecordingContext } from '../../test/recording-context';
import { BOARD_COLORS, drawReplayFrame, niceStep } from './drawFrame';
import type { DrawInput } from './drawFrame';
import { getBackdrop } from './replayView';

const cal = { originX: 0, originY: 1400, scale: 2 };
const player = (
  id: string,
  team: 'CT' | 'T',
  x: number,
  y: number,
  hp = 100,
  yaw = 0,
): PlayerSample => ({
  id,
  team,
  x,
  y,
  z: 0,
  yaw,
  hp,
});
const frame: Frame = {
  t: 0,
  players: [
    player('a', 'CT', 400, 700),
    player('b', 'T', 1000, 300, 100, 90),
    player('c', 'T', 800, 800, 0),
  ],
};
const base: DrawInput = {
  width: 1000,
  height: 700,
  calibration: cal,
  backdrop: null,
  frame,
  kills: [],
  names: { a: 'Alpha', b: 'Bravo', c: 'Charlie' },
};

describe('niceStep', () => {
  it.each([
    [0.7, 1],
    [1, 1],
    [1.5, 2],
    [3, 5],
    [7, 10],
    [180, 200],
    [0, 1],
    [-4, 1],
  ])('rounds %d up to %d', (raw, expected) => expect(niceStep(raw)).toBe(expected));
});

describe('drawReplayFrame', () => {
  it('paints the board background first', () => {
    const { ctx, calls } = createRecordingContext();
    drawReplayFrame(ctx, base);
    expect(calls[0]).toMatchObject({
      name: 'fillRect',
      args: [0, 0, 1000, 700],
      fillStyle: BOARD_COLORS.board,
    });
  });

  it('draws only the background and grid without a frame', () => {
    const { ctx, named } = createRecordingContext();
    drawReplayFrame(ctx, { ...base, frame: null });
    expect(named('arc')).toHaveLength(0);
    expect(named('stroke').length).toBeGreaterThan(0);
  });

  it('draws one disc per living player at its calibrated position', () => {
    const { ctx, named } = createRecordingContext();
    drawReplayFrame(ctx, base);
    const arcs = named('arc');
    expect(arcs).toHaveLength(2);
    const alpha = worldToMap({ x: 400, y: 700 }, cal);
    expect(arcs[0]!.args.slice(0, 2)).toEqual([alpha.x, alpha.y]);
    expect(arcs[0]!.fillStyle).toBe(BOARD_COLORS.ct);
    expect(arcs[1]!.fillStyle).toBe(BOARD_COLORS.t);
  });

  it('draws a cross instead of a disc for dead players', () => {
    const { ctx, named } = createRecordingContext();
    drawReplayFrame(ctx, { ...base, frame: { t: 0, players: [player('c', 'T', 800, 800, 0)] } });
    expect(named('arc')).toHaveLength(0);
    expect(named('moveTo').length).toBeGreaterThanOrEqual(2);
    expect(named('fillText')).toHaveLength(0);
  });

  it('points the view line along the yaw (screen Y is flipped)', () => {
    const { ctx, named } = createRecordingContext();
    drawReplayFrame(ctx, {
      ...base,
      frame: { t: 0, players: [player('b', 'T', 1000, 300, 100, 90)] },
    });
    const start = worldToMap({ x: 1000, y: 300 }, cal);
    const lines = named('lineTo').filter((c) => c.strokeStyle === BOARD_COLORS.t);
    expect(lines[0]!.args[0]).toBeCloseTo(start.x);
    expect(lines[0]!.args[1]).toBeCloseTo(start.y - 16);
  });

  it('labels living players with their names', () => {
    const { ctx, named } = createRecordingContext();
    drawReplayFrame(ctx, base);
    expect(named('fillText').map((c) => c.args[0])).toEqual(['Alpha', 'Bravo']);
  });

  it('falls back to the id when a name is unknown', () => {
    const { ctx, named } = createRecordingContext();
    drawReplayFrame(ctx, { ...base, names: {} });
    expect(named('fillText').map((c) => c.args[0])).toEqual(['a', 'b']);
  });

  it('rings the highlighted player', () => {
    const { ctx, named } = createRecordingContext();
    drawReplayFrame(ctx, { ...base, highlightId: 'a' });
    expect(named('arc').filter((c) => c.args[2] === 11)).toHaveLength(1);
  });

  it('draws a fading line from killer to victim for recent kills', () => {
    const { ctx, named } = createRecordingContext();
    const kill = {
      t: 1,
      killerId: 'a',
      victimId: 'c',
      assisterId: null,
      weapon: 'ak47',
      headshot: false,
    };
    drawReplayFrame(ctx, { ...base, kills: [{ kill, progress: 0.25 }] });
    const killLines = named('lineTo').filter(
      (c) => c.strokeStyle === BOARD_COLORS.kill && c.alpha === 0.75,
    );
    expect(killLines).toHaveLength(1);
    const victim = worldToMap({ x: 800, y: 800 }, cal);
    expect(killLines[0]!.args).toEqual([victim.x, victim.y]);
  });

  it('draws no kill line for world deaths (no killer)', () => {
    const kill = {
      t: 1,
      killerId: null,
      victimId: 'c',
      assisterId: null,
      weapon: 'world',
      headshot: false,
    };
    const without = createRecordingContext();
    drawReplayFrame(without.ctx, base);
    const withKill = createRecordingContext();
    drawReplayFrame(withKill.ctx, { ...base, kills: [{ kill, progress: 0 }] });
    expect(withKill.named('lineTo')).toHaveLength(without.named('lineTo').length);
  });

  it('draws the arena outline and walls when a backdrop is provided', () => {
    const backdrop = getBackdrop('sample_arena')!;
    const { ctx, named } = createRecordingContext();
    drawReplayFrame(ctx, { ...base, backdrop, frame: null });
    expect(named('strokeRect')).toHaveLength(1 + backdrop.walls.length);
    expect(named('fillRect')).toHaveLength(1 + backdrop.walls.length);
  });
});
