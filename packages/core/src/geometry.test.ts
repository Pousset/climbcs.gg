import { describe, expect, it } from 'vitest';
import { computeBounds, fitCalibration, mapToWorld, worldToMap } from './geometry';

describe('computeBounds', () => {
  it('returns the min and max on both axes', () => {
    const b = computeBounds([
      { x: 5, y: -2 },
      { x: -3, y: 10 },
      { x: 1, y: 4 },
    ]);
    expect(b).toEqual({ minX: -3, minY: -2, maxX: 5, maxY: 10 });
  });

  it('handles a single point', () => {
    expect(computeBounds([{ x: 2, y: 3 }])).toEqual({ minX: 2, minY: 3, maxX: 2, maxY: 3 });
  });

  it('throws on an empty list', () => {
    expect(() => computeBounds([])).toThrow(RangeError);
  });
});

describe('worldToMap / mapToWorld', () => {
  const cal = { originX: -100, originY: 200, scale: 2 };

  it('converts world units to pixels and flips Y', () => {
    expect(worldToMap({ x: -100, y: 200 }, cal)).toEqual({ x: 0, y: 0 });
    expect(worldToMap({ x: 0, y: 100 }, cal)).toEqual({ x: 50, y: 50 });
  });

  it('is reversible', () => {
    const p = { x: 123.4, y: -56.7 };
    const back = mapToWorld(worldToMap(p, cal), cal);
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
  });
});

describe('fitCalibration', () => {
  const viewport = { width: 800, height: 600 };

  it('fits a wide area and centres it vertically', () => {
    const cal = fitCalibration({ minX: 0, minY: 0, maxX: 1600, maxY: 400 }, viewport);
    expect(cal.scale).toBe(2);
    expect(worldToMap({ x: 0, y: 400 }, cal)).toEqual({ x: 0, y: 200 });
    expect(worldToMap({ x: 1600, y: 0 }, cal)).toEqual({ x: 800, y: 400 });
  });

  it('fits a tall area and centres it horizontally', () => {
    const cal = fitCalibration({ minX: 0, minY: 0, maxX: 300, maxY: 600 }, viewport);
    expect(cal.scale).toBe(1);
    expect(worldToMap({ x: 0, y: 0 }, cal).x).toBe(250);
  });

  it('keeps every corner inside the padded viewport', () => {
    const bounds = { minX: -1000, minY: -500, maxX: 3000, maxY: 2500 };
    const cal = fitCalibration(bounds, viewport, 40);
    for (const x of [bounds.minX, bounds.maxX]) {
      for (const y of [bounds.minY, bounds.maxY]) {
        const p = worldToMap({ x, y }, cal);
        expect(p.x).toBeGreaterThanOrEqual(40 - 1e-9);
        expect(p.x).toBeLessThanOrEqual(760 + 1e-9);
        expect(p.y).toBeGreaterThanOrEqual(40 - 1e-9);
        expect(p.y).toBeLessThanOrEqual(560 + 1e-9);
      }
    }
  });

  it('falls back to scale 1 for a degenerate (single point) area', () => {
    const cal = fitCalibration({ minX: 5, minY: 5, maxX: 5, maxY: 5 }, viewport);
    expect(cal.scale).toBe(1);
    expect(worldToMap({ x: 5, y: 5 }, cal)).toEqual({ x: 400, y: 300 });
  });
});
