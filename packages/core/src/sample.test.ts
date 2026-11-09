import { describe, expect, it } from 'vitest';
import { generateSampleReplay, SAMPLE_ARENA, SAMPLE_PLAYER_ID } from './sample';
import { computeScoreboard } from './stats';

describe('generateSampleReplay', () => {
  const data = generateSampleReplay();

  it('is deterministic for a given seed and varies with the seed', () => {
    expect(generateSampleReplay(7)).toEqual(data);
    expect(generateSampleReplay(8).rounds[0]!.frames[40]).not.toEqual(data.rounds[0]!.frames[40]);
  });

  it('describes a 5v5 match of three rounds', () => {
    expect(data.rounds).toHaveLength(3);
    expect(Object.keys(data.players)).toHaveLength(10);
    expect(data.players[SAMPLE_PLAYER_ID]).toBe('Aegis');
  });

  it('produces evenly spaced frames from 0 to the round duration', () => {
    for (const round of data.rounds) {
      const times = round.frames.map((f) => f.t);
      expect(times[0]).toBe(0);
      expect(times[times.length - 1]).toBe(round.durationSeconds);
      times.slice(1).forEach((t, i) => expect(t - times[i]!).toBeCloseTo(1 / data.sampleRateHz));
    }
  });

  it('keeps all ten players in every frame, inside the arena', () => {
    for (const round of data.rounds) {
      for (const frame of round.frames) {
        expect(frame.players).toHaveLength(10);
        for (const p of frame.players) {
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(SAMPLE_ARENA.width);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeLessThanOrEqual(SAMPLE_ARENA.height);
        }
      }
    }
  });

  it('references only known players in events', () => {
    for (const round of data.rounds) {
      for (const k of round.kills) {
        expect(data.players[k.victimId]).toBeDefined();
        expect(data.players[k.killerId!]).toBeDefined();
      }
    }
  });

  it('sets victims to 0 hp from their death time onwards and keeps them still', () => {
    const round = data.rounds[0]!;
    const kill = round.kills[0]!;
    const after = round.frames.filter((f) => f.t >= kill.t);
    const positions = after.map((f) => f.players.find((p) => p.id === kill.victimId)!);
    expect(positions.every((p) => p.hp === 0)).toBe(true);
    expect(new Set(positions.map((p) => `${p.x}|${p.y}`)).size).toBe(1);
    const before = round.frames.find((f) => f.t === kill.t - 1)!;
    expect(before.players.find((p) => p.id === kill.victimId)!.hp).toBe(100);
  });

  it('yields a coherent scoreboard', () => {
    const board = computeScoreboard(data);
    const totalKills = board.reduce((sum, p) => sum + p.kills, 0);
    const totalDeaths = board.reduce((sum, p) => sum + p.deaths, 0);
    expect(totalKills).toBe(20);
    expect(totalDeaths).toBe(20);
    expect(board.every((p) => p.rounds === 3)).toBe(true);
  });
});
