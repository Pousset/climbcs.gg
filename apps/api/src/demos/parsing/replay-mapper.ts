import type { DamageEvent, Frame, KillEvent, ReplayData, ReplayRound, Team } from '@cs2/core';

/**
 * Parser-agnostic intermediate shapes. The `normalize*` helpers convert the loosely typed
 * objects returned by demoparser2 into these, so the rest of the pipeline stays strictly typed
 * and unit-testable without a real demo file.
 */
export interface RawRound {
  startTick: number;
  endTick: number;
  winner: Team | null;
}

export interface RawTickRow {
  tick: number;
  steamId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  health: number;
  team: Team;
}

export interface RawKill {
  tick: number;
  attackerId: string | null;
  victimId: string;
  assisterId: string | null;
  weapon: string;
  headshot: boolean;
}

export interface RawHurt {
  tick: number;
  attackerId: string | null;
  victimId: string;
  damage: number;
}

export interface RawDemo {
  mapName: string;
  tickRate: number;
  sampleRateHz: number;
  rounds: RawRound[];
  rows: RawTickRow[];
  kills: RawKill[];
  hurts: RawHurt[];
  plantTicks: number[];
  defuseTicks: number[];
  explosionTicks: number[];
}

type Loose = Record<string, unknown>;

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Team number used by the game: 2 = Terrorists, 3 = Counter-Terrorists. */
export function normalizeTeam(value: unknown): Team | null {
  if (value === 2 || value === 'T' || value === 't' || value === 'TERRORIST') return 'T';
  if (value === 3 || value === 'CT' || value === 'ct') return 'CT';
  return null;
}

/** Nearest known CS2 tick rate (64 or 128) from the demo header, defaulting to 64. */
export function deriveTickRate(header: unknown): number {
  const { playback_ticks: ticks, playback_time: seconds } = (header ?? {}) as Loose;
  if (!isNumber(ticks) || !isNumber(seconds) || seconds <= 0) return 64;
  return Math.abs(ticks / seconds - 128) < Math.abs(ticks / seconds - 64) ? 128 : 64;
}

/** Steam ids come as strings or numbers; `0` and empty values mean "no player" (the world). */
function toPlayerId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const id = String(value);
  return id === '' || id === '0' ? null : id;
}

/**
 * Pairs round-end events with the latest round start preceding them. Ends without a start
 * (warm-up, restarts) are dropped. Output is sorted and never overlaps.
 */
export function pairRounds(
  startTicks: number[],
  ends: { tick: number; winner: unknown }[],
): RawRound[] {
  const starts = [...startTicks].sort((a, b) => a - b);
  const rounds: RawRound[] = [];
  let previousEnd = -Infinity;
  for (const end of [...ends].sort((a, b) => a.tick - b.tick)) {
    const candidates = starts.filter((s) => s > previousEnd && s < end.tick);
    const start = candidates[candidates.length - 1];
    if (start === undefined) continue;
    rounds.push({ startTick: start, endTick: end.tick, winner: normalizeTeam(end.winner) });
    previousEnd = end.tick;
  }
  return rounds;
}

export function normalizeTickRows(rows: unknown[]): RawTickRow[] {
  const out: RawTickRow[] = [];
  for (const row of rows as Loose[]) {
    const team = normalizeTeam(row['team_num']);
    const steamId = toPlayerId(row['steamid']);
    if (
      !team ||
      !steamId ||
      !isNumber(row['tick']) ||
      !isNumber(row['X']) ||
      !isNumber(row['Y']) ||
      !isNumber(row['Z']) ||
      !isNumber(row['yaw']) ||
      !isNumber(row['health'])
    ) {
      continue;
    }
    out.push({
      tick: row['tick'],
      steamId,
      name: typeof row['name'] === 'string' && row['name'] ? row['name'] : steamId,
      x: row['X'],
      y: row['Y'],
      z: row['Z'],
      yaw: row['yaw'],
      health: row['health'],
      team,
    });
  }
  return out;
}

export function normalizeKills(events: unknown[]): RawKill[] {
  const out: RawKill[] = [];
  for (const e of events as Loose[]) {
    const victimId = toPlayerId(e['user_steamid']);
    if (!isNumber(e['tick']) || !victimId) continue;
    const attacker = toPlayerId(e['attacker_steamid']);
    out.push({
      tick: e['tick'],
      attackerId: attacker === victimId ? null : attacker,
      victimId,
      assisterId: toPlayerId(e['assister_steamid']),
      weapon: typeof e['weapon'] === 'string' ? e['weapon'] : 'unknown',
      headshot: e['headshot'] === true,
    });
  }
  return out;
}

export function normalizeHurts(events: unknown[]): RawHurt[] {
  const out: RawHurt[] = [];
  for (const e of events as Loose[]) {
    const victimId = toPlayerId(e['user_steamid']);
    const attackerId = toPlayerId(e['attacker_steamid']);
    if (!isNumber(e['tick']) || !isNumber(e['dmg_health']) || !victimId || !attackerId) continue;
    if (attackerId === victimId) continue;
    out.push({ tick: e['tick'], attackerId, victimId, damage: e['dmg_health'] });
  }
  return out;
}

export function extractTicks(events: unknown[]): number[] {
  return (events as Loose[]).map((e) => e['tick']).filter(isNumber);
}

const within = (tick: number, round: RawRound): boolean =>
  tick >= round.startTick && tick <= round.endTick;

/** Builds the normalised {@link ReplayData}; times are seconds since each round's start tick. */
export function buildReplayData(raw: RawDemo): ReplayData {
  const players: Record<string, string> = {};
  for (const row of raw.rows) players[row.steamId] ??= row.name;

  const toSeconds = (tick: number, round: RawRound): number =>
    (tick - round.startTick) / raw.tickRate;
  const firstIn = (ticks: number[], round: RawRound): number | null => {
    const tick = ticks.find((t) => within(t, round));
    return tick === undefined ? null : toSeconds(tick, round);
  };

  const rounds: ReplayRound[] = [];
  for (const round of raw.rounds) {
    const byTick = new Map<number, RawTickRow[]>();
    for (const row of raw.rows) {
      if (!within(row.tick, round)) continue;
      const bucket = byTick.get(row.tick);
      if (bucket) bucket.push(row);
      else byTick.set(row.tick, [row]);
    }
    if (byTick.size === 0) continue;

    const frames: Frame[] = [...byTick.entries()]
      .sort(([a], [b]) => a - b)
      .map(([tick, rows]) => ({
        t: toSeconds(tick, round),
        players: rows.map((r) => ({
          id: r.steamId,
          x: r.x,
          y: r.y,
          z: r.z,
          yaw: r.yaw,
          hp: Math.max(0, r.health),
          team: r.team,
        })),
      }));

    const kills: KillEvent[] = raw.kills
      .filter((k) => within(k.tick, round))
      .map((k) => ({
        t: toSeconds(k.tick, round),
        killerId: k.attackerId,
        victimId: k.victimId,
        assisterId: k.assisterId,
        weapon: k.weapon,
        headshot: k.headshot,
      }));

    const damages: DamageEvent[] = raw.hurts
      .filter((h) => within(h.tick, round))
      .map((h) => ({
        t: toSeconds(h.tick, round),
        attackerId: h.attackerId!,
        victimId: h.victimId,
        amount: h.damage,
      }));

    rounds.push({
      number: rounds.length + 1,
      winner: round.winner,
      durationSeconds: (round.endTick - round.startTick) / raw.tickRate,
      frames,
      kills,
      damages,
      bomb: {
        plantedAt: firstIn(raw.plantTicks, round),
        defusedAt: firstIn(raw.defuseTicks, round),
        explodedAt: firstIn(raw.explosionTicks, round),
      },
    });
  }

  return {
    map: raw.mapName,
    tickRate: raw.tickRate,
    sampleRateHz: raw.sampleRateHz,
    players,
    rounds,
  };
}
