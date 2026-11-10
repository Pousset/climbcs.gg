import { Injectable } from '@nestjs/common';
import { parseEvent, parseHeader, parseTicks } from '@laihoe/demoparser2';
import { sampleTicks } from '@cs2/core';
import type { ReplayData } from '@cs2/core';
import { DemoParseError } from './demo-parser.port';
import type { DemoParser } from './demo-parser.port';
import {
  buildReplayData,
  deriveTickRate,
  extractTicks,
  normalizeHurts,
  normalizeKills,
  normalizeTickRows,
  pairRounds,
} from './replay-mapper';

export const SAMPLE_RATE_HZ = 8;

/** Properties sampled for every player (name, steamid and tick are always returned). */
const TICK_PROPS = ['X', 'Y', 'Z', 'yaw', 'health', 'team_num'];

/**
 * {@link DemoParser} backed by `@laihoe/demoparser2` (Rust, native addon).
 *
 * NOTE: parsing is CPU-bound and synchronous. V1 runs it in the API process; V2 moves it to a
 * job worker so the HTTP event loop is never blocked.
 */
@Injectable()
export class Demoparser2Adapter implements DemoParser {
  async parse(filePath: string): Promise<ReplayData> {
    try {
      return this.parseSync(filePath);
    } catch (error) {
      if (error instanceof DemoParseError) throw error;
      throw new DemoParseError('PARSE_FAILED', error);
    }
  }

  private parseSync(filePath: string): ReplayData {
    const header = parseHeader(filePath) as { map_name?: unknown };
    const tickRate = deriveTickRate(header);

    const freezeEnds = extractTicks(parseEvent(filePath, 'round_freeze_end') as unknown[]);
    const roundEnds = (parseEvent(filePath, 'round_end') as { tick?: number; winner?: unknown }[])
      .filter((e) => typeof e.tick === 'number')
      .map((e) => ({ tick: e.tick as number, winner: e.winner }));
    const rounds = pairRounds(freezeEnds, roundEnds);
    if (rounds.length === 0) throw new DemoParseError('NO_ROUNDS');

    const wantedTicks = rounds.flatMap((r) =>
      sampleTicks(r.startTick, r.endTick, tickRate, SAMPLE_RATE_HZ),
    );

    return buildReplayData({
      mapName: typeof header.map_name === 'string' ? header.map_name : 'unknown',
      tickRate,
      sampleRateHz: SAMPLE_RATE_HZ,
      rounds,
      rows: normalizeTickRows(parseTicks(filePath, TICK_PROPS, wantedTicks) as unknown[]),
      kills: normalizeKills(parseEvent(filePath, 'player_death') as unknown[]),
      hurts: normalizeHurts(parseEvent(filePath, 'player_hurt') as unknown[]),
      plantTicks: extractTicks(parseEvent(filePath, 'bomb_planted') as unknown[]),
      defuseTicks: extractTicks(parseEvent(filePath, 'bomb_defused') as unknown[]),
      explosionTicks: extractTicks(parseEvent(filePath, 'bomb_exploded') as unknown[]),
    });
  }
}
