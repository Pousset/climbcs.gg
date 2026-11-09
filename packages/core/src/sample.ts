import type { Frame, KillEvent, PlayerSample, ReplayData, ReplayRound, Team } from './types';

/** Fictional map used for the landing-page demo; it does not reproduce any game asset. */
export const SAMPLE_MAP = 'sample_arena';
export const SAMPLE_ARENA = { width: 2000, height: 1400 } as const;
export const SAMPLE_PLAYER_ID = 'sample-ct-1';

const SAMPLE_RATE_HZ = 8;
const ROUND_SECONDS = 45;
const NAMES = {
  CT: ['Aegis', 'Nova', 'Pixel', 'Rook', 'Sable'],
  T: ['Vex', 'Quill', 'Onyx', 'Dune', 'Flint'],
} as const;

/** [time, killer index, victim index, headshot]; indexes 0-4 are CT, 5-9 are T. */
type ScriptedKill = readonly [number, number, number, boolean];

const ROUND_SCRIPTS: ReadonlyArray<{
  winner: Team;
  kills: ScriptedKill[];
  bomb: ReplayRound['bomb'];
}> = [
  {
    winner: 'CT',
    kills: [
      [6, 0, 5, true],
      [9, 6, 1, false],
      [11, 2, 6, false],
      [18, 3, 7, false],
      [24, 8, 3, true],
      [26, 4, 8, false],
      [31, 0, 9, false],
    ],
    bomb: { plantedAt: null, defusedAt: null, explodedAt: null },
  },
  {
    winner: 'T',
    kills: [
      [8, 5, 0, false],
      [10, 6, 1, false],
      [12, 2, 6, true],
      [20, 7, 2, false],
      [22, 3, 7, true],
      [27, 8, 3, false],
      [30, 4, 8, false],
      [33, 9, 4, true],
    ],
    bomb: { plantedAt: 19, defusedAt: null, explodedAt: null },
  },
  {
    winner: 'CT',
    kills: [
      [7, 0, 5, true],
      [14, 1, 6, false],
      [15, 7, 2, false],
      [19, 3, 7, true],
      [40, 4, 8, false],
    ],
    bomb: { plantedAt: 20, defusedAt: 38, explodedAt: null },
  },
];

/** Small deterministic PRNG so the sample is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Path {
  points: [number, number][];
}

const playerId = (index: number): string =>
  index < 5 ? `sample-ct-${index + 1}` : `sample-t-${index - 4}`;

function positionAt(path: Path, progress: number): { x: number; y: number; yaw: number } {
  const segments = path.points.length - 1;
  const scaled = Math.min(Math.max(progress, 0), 1) * segments;
  const i = Math.min(Math.floor(scaled), segments - 1);
  const k = scaled - i;
  const [x0, y0] = path.points[i]!;
  const [x1, y1] = path.points[i + 1]!;
  const yaw = ((((Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI) % 360) + 360) % 360;
  return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, yaw };
}

/** Deterministic 3-round, 5v5 match on a fictional arena, used for demos and tests. */
export function generateSampleReplay(seed = 7): ReplayData {
  const rand = mulberry32(seed);
  const players: Record<string, string> = {};
  for (let i = 0; i < 10; i++) {
    players[playerId(i)] = i < 5 ? NAMES.CT[i]! : NAMES.T[i - 5]!;
  }

  const rounds: ReplayRound[] = ROUND_SCRIPTS.map((script, roundIndex) => {
    const paths: Path[] = Array.from({ length: 10 }, (_, i) => {
      const startX = i < 5 ? 220 : 1780;
      const startY = 300 + (i % 5) * 200;
      const mid: [number, number] = [700 + rand() * 600, 200 + rand() * 1000];
      const end: [number, number] = [
        i < 5 ? 1200 + rand() * 300 : 500 + rand() * 300,
        200 + rand() * 1000,
      ];
      return { points: [[startX, startY], mid, end] };
    });

    const deathTime = new Map<number, number>();
    for (const [t, , victim] of script.kills) deathTime.set(victim, t);

    const frames: Frame[] = [];
    const steps = ROUND_SECONDS * SAMPLE_RATE_HZ;
    for (let s = 0; s <= steps; s++) {
      const t = s / SAMPLE_RATE_HZ;
      const samples: PlayerSample[] = paths.map((path, i) => {
        const died = deathTime.get(i);
        const effective = died !== undefined && t >= died ? died : t;
        const pos = positionAt(path, effective / ROUND_SECONDS);
        return {
          id: playerId(i),
          x: pos.x,
          y: pos.y,
          z: 0,
          yaw: pos.yaw,
          hp: died !== undefined && t >= died ? 0 : 100,
          team: i < 5 ? 'CT' : 'T',
        };
      });
      frames.push({ t, players: samples });
    }

    const kills: KillEvent[] = script.kills.map(([t, killer, victim, headshot]) => ({
      t,
      killerId: playerId(killer),
      victimId: playerId(victim),
      assisterId: null,
      weapon: headshot ? 'ak47' : 'm4a1',
      headshot,
    }));
    const damages = script.kills.map(([t, killer, victim]) => ({
      t: t - 0.2,
      attackerId: playerId(killer),
      victimId: playerId(victim),
      amount: 100,
    }));

    return {
      number: roundIndex + 1,
      winner: script.winner,
      durationSeconds: ROUND_SECONDS,
      frames,
      kills,
      damages,
      bomb: script.bomb,
    };
  });

  return { map: SAMPLE_MAP, tickRate: 64, sampleRateHz: SAMPLE_RATE_HZ, players, rounds };
}
