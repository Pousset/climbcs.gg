import { describe, expect, it } from 'vitest';
import { sampleTicks, ticksToSeconds } from './sampling';

describe('sampleTicks', () => {
  it('samples every 4 ticks for 16 Hz at 64 tick/s and keeps the last tick', () => {
    expect(sampleTicks(100, 120, 64, 16)).toEqual([100, 104, 108, 112, 116, 120]);
  });

  it('appends the end tick when the step does not land on it', () => {
    expect(sampleTicks(0, 10, 64, 16)).toEqual([0, 4, 8, 10]);
  });

  it('returns a single tick for an empty range', () => {
    expect(sampleTicks(50, 50, 64, 16)).toEqual([50]);
  });

  it('never uses a step below one tick', () => {
    expect(sampleTicks(0, 3, 64, 1000)).toEqual([0, 1, 2, 3]);
  });

  it('rejects invalid arguments', () => {
    expect(() => sampleTicks(0, 10, 0, 16)).toThrow(RangeError);
    expect(() => sampleTicks(0, 10, 64, 0)).toThrow(RangeError);
    expect(() => sampleTicks(10, 0, 64, 16)).toThrow(RangeError);
  });
});

describe('ticksToSeconds', () => {
  it('converts a tick offset to seconds', () => {
    expect(ticksToSeconds(164, 100, 64)).toBe(1);
    expect(ticksToSeconds(100, 100, 64)).toBe(0);
  });

  it('rejects a non-positive tick rate', () => {
    expect(() => ticksToSeconds(1, 0, 0)).toThrow(RangeError);
  });
});
