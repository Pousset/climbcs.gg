import type { Frame, PlayerSample } from './types';

/** Linear interpolation between `a` and `b`; `k` is the progress in [0, 1]. */
export function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

/** Interpolates two angles in degrees along the shortest arc. Result is in [0, 360). */
export function lerpAngle(a: number, b: number, k: number): number {
  const delta = ((((b - a) % 360) + 540) % 360) - 180;
  return (((a + delta * k) % 360) + 360) % 360;
}

/** Interpolates position and view angle; identity and life state come from `a`. */
export function interpolatePlayer(a: PlayerSample, b: PlayerSample, k: number): PlayerSample {
  return {
    ...a,
    x: lerp(a.x, b.x, k),
    y: lerp(a.y, b.y, k),
    z: lerp(a.z, b.z, k),
    yaw: lerpAngle(a.yaw, b.yaw, k),
  };
}

/**
 * State of the match at time `t` (seconds), interpolated from the two surrounding frames.
 * `frames` must be sorted by `t`. Times outside the range are clamped to the first or last frame.
 * Players absent from the next frame (disconnected) keep their last known state.
 */
export function interpolateFrame(frames: Frame[], t: number): Frame | null {
  if (frames.length === 0) return null;
  const first = frames[0]!;
  const last = frames[frames.length - 1]!;
  if (t <= first.t) return first;
  if (t >= last.t) return last;

  let lo = 0;
  let hi = frames.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (frames[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  const a = frames[lo]!;
  const b = frames[hi]!;
  const k = (t - a.t) / (b.t - a.t);
  const next = new Map(b.players.map((p) => [p.id, p]));
  return {
    t,
    players: a.players.map((p) => {
      const target = next.get(p.id);
      return target ? interpolatePlayer(p, target, k) : p;
    }),
  };
}
