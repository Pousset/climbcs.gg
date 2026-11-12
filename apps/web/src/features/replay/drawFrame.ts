import { mapToWorld, worldToMap } from '@cs2/core';
import type { Frame, MapCalibration } from '@cs2/core';
import type { Backdrop, VisibleKill } from './replayView';

/** Canvas cannot read CSS variables, so the board palette is mirrored from styles/tokens.css. */
export const BOARD_COLORS = {
  board: '#16232f',
  grid: '#2a3d4d',
  wall: '#233a4c',
  wallEdge: '#3b566b',
  ct: '#3f83c9',
  t: '#e0962c',
  kill: '#d44b3a',
  text: '#dbe5ec',
} as const;

export interface DrawInput {
  width: number;
  height: number;
  calibration: MapCalibration;
  backdrop: Backdrop | null;
  frame: Frame | null;
  kills: VisibleKill[];
  names: Record<string, string>;
  highlightId?: string | null;
}

/** Smallest "nice" number (1, 2, 5 x 10^n) that is at least `raw`. */
export function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? magnitude * 10;
}

function drawGrid(ctx: CanvasRenderingContext2D, { width, height, calibration }: DrawInput): void {
  const step = niceStep(calibration.scale * 90);
  const topLeft = mapToWorld({ x: 0, y: 0 }, calibration);
  const bottomRight = mapToWorld({ x: width, y: height }, calibration);
  ctx.strokeStyle = BOARD_COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = Math.ceil(topLeft.x / step) * step; x <= bottomRight.x; x += step) {
    const { x: px } = worldToMap({ x, y: 0 }, calibration);
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
  }
  for (let y = Math.ceil(bottomRight.y / step) * step; y <= topLeft.y; y += step) {
    const { y: py } = worldToMap({ x: 0, y }, calibration);
    ctx.moveTo(0, py);
    ctx.lineTo(width, py);
  }
  ctx.stroke();
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  backdrop: Backdrop,
  cal: MapCalibration,
): void {
  const rect = (b: { minX: number; minY: number; maxX: number; maxY: number }) => {
    const topLeft = worldToMap({ x: b.minX, y: b.maxY }, cal);
    return {
      x: topLeft.x,
      y: topLeft.y,
      w: (b.maxX - b.minX) / cal.scale,
      h: (b.maxY - b.minY) / cal.scale,
    };
  };
  const arena = rect(backdrop.bounds);
  ctx.strokeStyle = BOARD_COLORS.wallEdge;
  ctx.lineWidth = 3;
  ctx.strokeRect(arena.x, arena.y, arena.w, arena.h);
  for (const wall of backdrop.walls) {
    const r = rect(wall);
    ctx.fillStyle = BOARD_COLORS.wall;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = BOARD_COLORS.wallEdge;
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }
}

/** Draws one frame of the replay: grid, decor, kill lines, then the players on top. */
export function drawReplayFrame(ctx: CanvasRenderingContext2D, input: DrawInput): void {
  const { width, height, calibration, backdrop, frame, kills, names, highlightId } = input;
  ctx.fillStyle = BOARD_COLORS.board;
  ctx.fillRect(0, 0, width, height);
  drawGrid(ctx, input);
  if (backdrop) drawBackdrop(ctx, backdrop, calibration);
  if (!frame) return;

  const positions = new Map(frame.players.map((p) => [p.id, worldToMap(p, calibration)]));

  for (const { kill, progress } of kills) {
    const from = kill.killerId ? positions.get(kill.killerId) : undefined;
    const to = positions.get(kill.victimId);
    if (!from || !to) continue;
    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = BOARD_COLORS.kill;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.font = '12px "IBM Plex Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const player of frame.players) {
    const { x, y } = positions.get(player.id)!;
    if (player.hp <= 0) {
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = BOARD_COLORS.kill;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 5);
      ctx.lineTo(x + 5, y + 5);
      ctx.moveTo(x + 5, y - 5);
      ctx.lineTo(x - 5, y + 5);
      ctx.stroke();
      ctx.globalAlpha = 1;
      continue;
    }
    const color = player.team === 'CT' ? BOARD_COLORS.ct : BOARD_COLORS.t;
    const radians = (player.yaw * Math.PI) / 180;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(radians) * 16, y - Math.sin(radians) * 16);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();

    if (player.id === highlightId) {
      ctx.strokeStyle = BOARD_COLORS.text;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = BOARD_COLORS.text;
    ctx.fillText(names[player.id] ?? player.id, x, y + 22);
  }
}
