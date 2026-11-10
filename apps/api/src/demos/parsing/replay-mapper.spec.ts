import {
  buildReplayData,
  deriveTickRate,
  extractTicks,
  normalizeHurts,
  normalizeKills,
  normalizeTeam,
  normalizeTickRows,
  pairRounds,
} from './replay-mapper';
import type { RawDemo } from './replay-mapper';

describe('normalizeTeam', () => {
  it('maps team numbers and names', () => {
    expect(normalizeTeam(2)).toBe('T');
    expect(normalizeTeam(3)).toBe('CT');
    expect(normalizeTeam('CT')).toBe('CT');
    expect(normalizeTeam('TERRORIST')).toBe('T');
  });

  it('returns null for spectators and unknown values', () => {
    expect(normalizeTeam(1)).toBeNull();
    expect(normalizeTeam(0)).toBeNull();
    expect(normalizeTeam(undefined)).toBeNull();
  });
});

describe('deriveTickRate', () => {
  it('detects 64 and 128 tick demos from the header', () => {
    expect(deriveTickRate({ playback_ticks: 128000, playback_time: 2000 })).toBe(64);
    expect(deriveTickRate({ playback_ticks: 250000, playback_time: 1950 })).toBe(128);
  });

  it('falls back to 64 when the header is unusable', () => {
    expect(deriveTickRate(undefined)).toBe(64);
    expect(deriveTickRate({ playback_ticks: 10, playback_time: 0 })).toBe(64);
    expect(deriveTickRate({})).toBe(64);
  });
});

describe('pairRounds', () => {
  it('pairs each end with the latest preceding start and reads the winner', () => {
    const rounds = pairRounds(
      [100, 1000, 2000],
      [
        { tick: 900, winner: 'CT' },
        { tick: 1900, winner: 2 },
      ],
    );
    expect(rounds).toEqual([
      { startTick: 100, endTick: 900, winner: 'CT' },
      { startTick: 1000, endTick: 1900, winner: 'T' },
    ]);
  });

  it('keeps only the last start before an end (restarts) and drops ends without a start', () => {
    const rounds = pairRounds(
      [50, 80, 500],
      [
        { tick: 20, winner: 'CT' },
        { tick: 400, winner: 'CT' },
        { tick: 450, winner: 'T' },
      ],
    );
    expect(rounds).toEqual([{ startTick: 80, endTick: 400, winner: 'CT' }]);
  });

  it('returns an unknown winner as null', () => {
    expect(pairRounds([0], [{ tick: 10, winner: 'draw' }])[0]?.winner).toBeNull();
  });
});

describe('normalizeTickRows', () => {
  const valid = {
    tick: 10,
    steamid: '765',
    name: 'Neo',
    X: 1,
    Y: 2,
    Z: 3,
    yaw: 90,
    health: 100,
    team_num: 3,
  };

  it('converts a well-formed row', () => {
    expect(normalizeTickRows([valid])).toEqual([
      { tick: 10, steamId: '765', name: 'Neo', x: 1, y: 2, z: 3, yaw: 90, health: 100, team: 'CT' },
    ]);
  });

  it('drops spectators, missing values and rows without a player', () => {
    const rows = normalizeTickRows([
      { ...valid, team_num: 1 },
      { ...valid, X: undefined },
      { ...valid, steamid: '0' },
      { ...valid, health: Number.NaN },
      valid,
    ]);
    expect(rows).toHaveLength(1);
  });

  it('falls back to the steam id when the name is missing', () => {
    expect(normalizeTickRows([{ ...valid, name: '' }])[0]?.name).toBe('765');
  });
});

describe('normalizeKills / normalizeHurts', () => {
  it('converts kills and treats the world and suicides as no killer', () => {
    const kills = normalizeKills([
      {
        tick: 5,
        user_steamid: 'v',
        attacker_steamid: 'a',
        assister_steamid: 'x',
        weapon: 'ak47',
        headshot: true,
      },
      { tick: 6, user_steamid: 'v', attacker_steamid: '0', weapon: 'world' },
      { tick: 7, user_steamid: 'v', attacker_steamid: 'v', weapon: 'suicide' },
      { tick: 8, attacker_steamid: 'a' },
    ]);
    expect(kills).toHaveLength(3);
    expect(kills[0]).toMatchObject({ attackerId: 'a', assisterId: 'x', headshot: true });
    expect(kills[1]).toMatchObject({ attackerId: null, assisterId: null, headshot: false });
    expect(kills[2]?.attackerId).toBeNull();
  });

  it('keeps only damage dealt by a player to another player', () => {
    const hurts = normalizeHurts([
      { tick: 1, user_steamid: 'v', attacker_steamid: 'a', dmg_health: 27 },
      { tick: 2, user_steamid: 'v', attacker_steamid: '0', dmg_health: 10 },
      { tick: 3, user_steamid: 'v', attacker_steamid: 'v', dmg_health: 5 },
      { tick: 4, user_steamid: 'v', attacker_steamid: 'a' },
    ]);
    expect(hurts).toEqual([{ tick: 1, attackerId: 'a', victimId: 'v', damage: 27 }]);
  });
});

describe('extractTicks', () => {
  it('collects numeric ticks only', () => {
    expect(extractTicks([{ tick: 1 }, { tick: 'x' }, {}, { tick: 7 }])).toEqual([1, 7]);
  });
});

describe('buildReplayData', () => {
  const row = (tick: number, steamId: string, team: 'T' | 'CT', health = 100) => ({
    tick,
    steamId,
    name: steamId.toUpperCase(),
    x: tick,
    y: 0,
    z: 0,
    yaw: 0,
    health,
    team,
  });
  const raw: RawDemo = {
    mapName: 'de_test',
    tickRate: 64,
    sampleRateHz: 16,
    rounds: [
      { startTick: 100, endTick: 228, winner: 'CT' },
      { startTick: 300, endTick: 428, winner: 'T' },
      { startTick: 500, endTick: 600, winner: 'CT' },
    ],
    rows: [
      row(100, 'a', 'CT'),
      row(100, 'b', 'T'),
      row(164, 'a', 'CT'),
      row(164, 'b', 'T', -5),
      row(228, 'a', 'CT'),
      row(228, 'b', 'T', 0),
      row(300, 'a', 'T'),
      row(300, 'b', 'CT'),
    ],
    kills: [
      {
        tick: 164,
        attackerId: 'a',
        victimId: 'b',
        assisterId: null,
        weapon: 'ak47',
        headshot: true,
      },
      {
        tick: 700,
        attackerId: 'a',
        victimId: 'b',
        assisterId: null,
        weapon: 'ak47',
        headshot: false,
      },
    ],
    hurts: [{ tick: 150, attackerId: 'a', victimId: 'b', damage: 100 }],
    plantTicks: [200, 320],
    defuseTicks: [],
    explosionTicks: [228],
  };
  const data = buildReplayData(raw);

  it('copies match metadata and player names', () => {
    expect(data).toMatchObject({ map: 'de_test', tickRate: 64, sampleRateHz: 16 });
    expect(data.players).toEqual({ a: 'A', b: 'B' });
  });

  it('skips rounds without any frame and numbers the others sequentially', () => {
    expect(data.rounds.map((r) => r.number)).toEqual([1, 2]);
    expect(data.rounds.map((r) => r.winner)).toEqual(['CT', 'T']);
  });

  it('expresses frame times in seconds from the round start, sorted', () => {
    expect(data.rounds[0]?.frames.map((f) => f.t)).toEqual([0, 1, 2]);
    expect(data.rounds[0]?.durationSeconds).toBe(2);
  });

  it('keeps each player team per round (side switch) and clamps negative health', () => {
    expect(data.rounds[1]?.frames[0]?.players.find((p) => p.id === 'a')?.team).toBe('T');
    expect(data.rounds[0]?.frames[1]?.players.find((p) => p.id === 'b')?.hp).toBe(0);
  });

  it('attaches events to the round they happened in', () => {
    expect(data.rounds[0]?.kills).toEqual([
      { t: 1, killerId: 'a', victimId: 'b', assisterId: null, weapon: 'ak47', headshot: true },
    ]);
    expect(data.rounds[1]?.kills).toEqual([]);
    expect(data.rounds[0]?.damages).toEqual([
      { t: 50 / 64, attackerId: 'a', victimId: 'b', amount: 100 },
    ]);
  });

  it('derives bomb timings per round', () => {
    expect(data.rounds[0]?.bomb).toEqual({ plantedAt: 100 / 64, defusedAt: null, explodedAt: 2 });
    expect(data.rounds[1]?.bomb).toEqual({ plantedAt: 20 / 64, defusedAt: null, explodedAt: null });
  });

  it('returns no rounds for an empty demo', () => {
    expect(buildReplayData({ ...raw, rounds: [], rows: [] }).rounds).toEqual([]);
  });
});
