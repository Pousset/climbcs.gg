/**
 * Ticks to extract from a demo for a time range, at roughly `hz` samples per second.
 * The first and last ticks of the range are always included.
 */
export function sampleTicks(
  startTick: number,
  endTick: number,
  tickRate: number,
  hz: number,
): number[] {
  if (tickRate <= 0 || hz <= 0) {
    throw new RangeError('tickRate and hz must be positive');
  }
  if (endTick < startTick) {
    throw new RangeError('endTick must be greater than or equal to startTick');
  }
  const step = Math.max(1, Math.round(tickRate / hz));
  const ticks: number[] = [];
  for (let tick = startTick; tick < endTick; tick += step) ticks.push(tick);
  ticks.push(endTick);
  return ticks;
}

/** Seconds elapsed between `startTick` and `tick`. */
export function ticksToSeconds(tick: number, startTick: number, tickRate: number): number {
  if (tickRate <= 0) throw new RangeError('tickRate must be positive');
  return (tick - startTick) / tickRate;
}
