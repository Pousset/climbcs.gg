import { computeBounds, fitCalibration, SAMPLE_ARENA, SAMPLE_MAP } from '@cs2/core';
import type { Bounds, Frame, KillEvent, MapCalibration, ReplayData } from '@cs2/core';

/** Static decor drawn under the players: world-space rectangles. */
export interface Backdrop {
  bounds: Bounds;
  walls: Bounds[];
}

/** Fictional arena used by the landing-page demo. Real maps will be hand-traced later. */
const SAMPLE_BACKDROP: Backdrop = {
  bounds: { minX: 0, minY: 0, maxX: SAMPLE_ARENA.width, maxY: SAMPLE_ARENA.height },
  walls: [
    { minX: 850, minY: 550, maxX: 1150, maxY: 850 },
    { minX: 450, minY: 200, maxX: 650, maxY: 500 },
    { minX: 450, minY: 900, maxX: 650, maxY: 1200 },
    { minX: 1350, minY: 200, maxX: 1550, maxY: 500 },
    { minX: 1350, minY: 900, maxX: 1550, maxY: 1200 },
    { minX: 820, minY: 120, maxX: 1180, maxY: 240 },
    { minX: 820, minY: 1160, maxX: 1180, maxY: 1280 },
  ],
};

export function getBackdrop(map: string): Backdrop | null {
  return map === SAMPLE_MAP ? SAMPLE_BACKDROP : null;
}

/** World area to display: the backdrop when there is one, else the area covered by the players. */
export function viewBounds(replay: ReplayData): Bounds {
  const backdrop = getBackdrop(replay.map);
  if (backdrop) return backdrop.bounds;
  const points = replay.rounds.flatMap((round) =>
    round.frames.flatMap((frame) => frame.players.map((p) => ({ x: p.x, y: p.y }))),
  );
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  const b = computeBounds(points);
  const margin = Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.06;
  return {
    minX: b.minX - margin,
    minY: b.minY - margin,
    maxX: b.maxX + margin,
    maxY: b.maxY + margin,
  };
}

export function createCalibration(
  replay: ReplayData,
  viewport: { width: number; height: number },
  padding = 24,
): MapCalibration {
  return fitCalibration(viewBounds(replay), viewport, padding);
}

export interface VisibleKill {
  kill: KillEvent;
  /** 0 right after the kill, approaching 1 as the marker fades out. */
  progress: number;
}

/** Kills that happened within the last `windowSeconds` before `t`. */
export function visibleKills(kills: KillEvent[], t: number, windowSeconds = 1.5): VisibleKill[] {
  return kills
    .filter((k) => k.t <= t && t - k.t < windowSeconds)
    .map((kill) => ({ kill, progress: (t - kill.t) / windowSeconds }));
}

/** The latest `limit` kills up to `t`, oldest first. */
export function recentKillFeed(kills: KillEvent[], t: number, limit = 5): KillEvent[] {
  return kills.filter((k) => k.t <= t).slice(-limit);
}

export function aliveCounts(frame: Frame | null): { CT: number; T: number } {
  const counts = { CT: 0, T: 0 };
  for (const p of frame?.players ?? []) if (p.hp > 0) counts[p.team] += 1;
  return counts;
}
