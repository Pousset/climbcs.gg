import { describe, expect, it } from 'vitest';
import { computeScoreboard, getRoundTeams, isTradedDeath, TRADE_WINDOW_SECONDS } from './stats';
import type { KillEvent, PlayerSample, ReplayData, ReplayRound, Team } from './types';

const sample = (id: string, team: Team): PlayerSample => ({
  id,
  team,
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  hp: 100,
});

const kill = (p: Partial<KillEvent> & Pick<KillEvent, 't' | 'victimId'>): KillEvent => ({
  killerId: null,
  assisterId: null,
  weapon: 'ak47',
  headshot: false,
  ...p,
});

const makeRound = (number: number, kills: KillEvent[], damages: ReplayRound['damages']) =>
  ({
    number,
    winner: null,
    durationSeconds: 60,
    frames: [
      {
        t: 0,
        players: [sample('a1', 'CT'), sample('a2', 'CT'), sample('b1', 'T'), sample('b2', 'T')],
      },
    ],
    kills,
    damages,
    bomb: { plantedAt: null, defusedAt: null, explodedAt: null },
  }) satisfies ReplayRound;

const data: ReplayData = {
  map: 'test',
  tickRate: 64,
  sampleRateHz: 8,
  players: { a1: 'Alpha', a2: 'Bravo', b1: 'Charlie', b2: 'Delta' },
  rounds: [
    makeRound(
      1,
      [
        kill({ t: 10, killerId: 'a1', victimId: 'b1', assisterId: 'a2', headshot: true }),
        kill({ t: 12, killerId: 'b2', victimId: 'a1' }),
        kill({ t: 15, killerId: 'a2', victimId: 'b2' }),
      ],
      [
        { t: 9, attackerId: 'a1', victimId: 'b1', amount: 70 },
        { t: 9, attackerId: 'a2', victimId: 'b1', amount: 30 },
        { t: 11, attackerId: 'b2', victimId: 'a1', amount: 100 },
        { t: 14, attackerId: 'a2', victimId: 'b2', amount: 100 },
        { t: 3, attackerId: 'a1', victimId: 'a2', amount: 20 },
      ],
    ),
    makeRound(
      2,
      [kill({ t: 5, victimId: 'b1' }), kill({ t: 8, killerId: 'a1', victimId: 'a2' })],
      [],
    ),
  ],
};

describe('getRoundTeams', () => {
  it('maps each player to the team of their first appearance', () => {
    const teams = getRoundTeams(data.rounds[0]!);
    expect(teams.get('a1')).toBe('CT');
    expect(teams.get('b2')).toBe('T');
  });
});

describe('isTradedDeath', () => {
  const teams = getRoundTeams(data.rounds[0]!);
  const kills = data.rounds[0]!.kills;

  it('detects a death avenged by a teammate inside the window', () => {
    expect(isTradedDeath(kills[1]!, kills, teams)).toBe(true);
  });

  it('is false when the avenging kill is outside the window', () => {
    expect(isTradedDeath(kills[1]!, kills, teams, 2)).toBe(false);
  });

  it('is false for world deaths and for team kills', () => {
    expect(isTradedDeath(kill({ t: 1, victimId: 'b1' }), [], teams)).toBe(false);
    expect(isTradedDeath(kill({ t: 1, killerId: 'a1', victimId: 'a2' }), [], teams)).toBe(false);
  });

  it('uses a 5 second window by default', () => {
    expect(TRADE_WINDOW_SECONDS).toBe(5);
    const first = kill({ t: 0, killerId: 'b1', victimId: 'a1' });
    const late = kill({ t: 6, killerId: 'a2', victimId: 'b1' });
    expect(isTradedDeath(first, [first, late], teams)).toBe(false);
  });
});

describe('computeScoreboard', () => {
  const board = computeScoreboard(data);
  const byId = (id: string) => board.find((p) => p.id === id)!;

  it('counts kills, deaths, assists and headshots', () => {
    expect(byId('a1')).toMatchObject({ kills: 1, deaths: 1, assists: 0, headshots: 1 });
    expect(byId('a2')).toMatchObject({ kills: 1, deaths: 1, assists: 1, headshots: 0 });
    expect(byId('b1')).toMatchObject({ kills: 0, deaths: 2 });
  });

  it('ignores team kills for the killer but counts the death', () => {
    expect(byId('a1').kills).toBe(1);
    expect(byId('a2').deaths).toBe(1);
  });

  it('ignores team damage', () => {
    expect(byId('a1').damage).toBe(70);
    expect(byId('a2').damage).toBe(130);
  });

  it('derives K/D, HS% and ADR', () => {
    expect(byId('a1').kd).toBe(1);
    expect(byId('b1').kd).toBe(0);
    expect(byId('a1').hsPercent).toBe(100);
    expect(byId('b2').hsPercent).toBe(0);
    expect(byId('a1').adr).toBe(35);
    expect(byId('a2').adr).toBe(65);
  });

  it('returns kills as K/D when a player never died', () => {
    const single: ReplayData = {
      ...data,
      rounds: [makeRound(1, [kill({ t: 1, killerId: 'a1', victimId: 'b1' })], [])],
    };
    expect(computeScoreboard(single).find((p) => p.id === 'a1')?.kd).toBe(1);
  });

  it('computes KAST from kills, assists, survival and trades', () => {
    expect(byId('a1')).toMatchObject({ kastRounds: 2, kast: 1, tradedDeaths: 1 });
    expect(byId('a2')).toMatchObject({ kastRounds: 1, kast: 0.5 });
    expect(byId('b1')).toMatchObject({ kastRounds: 1, kast: 0.5, tradedDeaths: 1 });
    expect(byId('b2')).toMatchObject({ kastRounds: 2, kast: 1, tradedDeaths: 0 });
  });

  it('counts rounds played per player', () => {
    expect(board.every((p) => p.rounds === 2)).toBe(true);
  });

  it('sorts by kills then name and resolves display names', () => {
    expect(board.map((p) => p.name)).toEqual(['Alpha', 'Bravo', 'Delta', 'Charlie']);
  });

  it('falls back to the id when a player has no known name', () => {
    const anonymous = computeScoreboard({ ...data, players: {} });
    expect(anonymous.map((p) => p.name).sort()).toEqual(['a1', 'a2', 'b1', 'b2']);
  });

  it('returns an empty scoreboard for a match without rounds', () => {
    expect(computeScoreboard({ ...data, rounds: [] })).toEqual([]);
  });
});
