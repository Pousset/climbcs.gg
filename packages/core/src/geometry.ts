import type { Point2D } from './types';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Viewport {
  width: number;
  height: number;
}

/**
 * Maps world coordinates to viewport pixels.
 * `originX`/`originY` is the world position of the viewport's top-left corner,
 * `scale` is the number of world units covered by one pixel.
 */
export interface MapCalibration {
  originX: number;
  originY: number;
  scale: number;
}

/** Smallest axis-aligned box containing all points. Throws on an empty list. */
export function computeBounds(points: Point2D[]): Bounds {
  if (points.length === 0) {
    throw new RangeError('computeBounds requires at least one point');
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/** World -> pixel. The Y axis is flipped because screen Y grows downwards. */
export function worldToMap(point: Point2D, cal: MapCalibration): Point2D {
  return { x: (point.x - cal.originX) / cal.scale, y: (cal.originY - point.y) / cal.scale };
}

/** Pixel -> world. Exact inverse of {@link worldToMap}. */
export function mapToWorld(point: Point2D, cal: MapCalibration): Point2D {
  return { x: point.x * cal.scale + cal.originX, y: cal.originY - point.y * cal.scale };
}

/**
 * Builds a calibration that fits `bounds` inside `viewport`, keeping the aspect ratio,
 * centring the content and leaving `padding` pixels on every side.
 */
export function fitCalibration(bounds: Bounds, viewport: Viewport, padding = 0): MapCalibration {
  const availW = Math.max(viewport.width - 2 * padding, 1);
  const availH = Math.max(viewport.height - 2 * padding, 1);
  const worldW = bounds.maxX - bounds.minX;
  const worldH = bounds.maxY - bounds.minY;
  const scale = Math.max(worldW / availW, worldH / availH) || 1;
  const offsetX = (viewport.width - worldW / scale) / 2;
  const offsetY = (viewport.height - worldH / scale) / 2;
  return { originX: bounds.minX - offsetX * scale, originY: bounds.maxY + offsetY * scale, scale };
}
