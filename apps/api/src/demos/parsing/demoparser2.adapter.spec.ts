import { parseEvent, parseHeader, parseTicks } from '@laihoe/demoparser2';
import { DemoParseError } from './demo-parser.port';
import { Demoparser2Adapter, SAMPLE_RATE_HZ } from './demoparser2.adapter';

jest.mock('@laihoe/demoparser2', () => ({
  parseHeader: jest.fn(),
  parseEvent: jest.fn(),
  parseTicks: jest.fn(),
}));

const events: Record<string, unknown[]> = {};
const mockedParseEvent = parseEvent as jest.Mock;
const mockedParseTicks = parseTicks as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  for (const key of Object.keys(events)) delete events[key];
  (parseHeader as jest.Mock).mockReturnValue({
    map_name: 'de_test',
    playback_ticks: 640,
    playback_time: 10,
  });
  mockedParseEvent.mockImplementation((_path: string, name: string) => events[name] ?? []);
});

const row = (tick: number, steamid: string, team_num: number) => ({
  tick,
  steamid,
  name: `P${steamid}`,
  X: tick,
  Y: 0,
  Z: 0,
  yaw: 0,
  health: 100,
  team_num,
});

describe('Demoparser2Adapter', () => {
  it('assembles a replay from header, events and sampled ticks', async () => {
    events['round_freeze_end'] = [{ tick: 100 }];
    events['round_end'] = [{ tick: 228, winner: 'CT' }];
    events['player_death'] = [
      { tick: 164, user_steamid: '2', attacker_steamid: '1', weapon: 'ak47', headshot: true },
    ];
    events['player_hurt'] = [
      { tick: 150, user_steamid: '2', attacker_steamid: '1', dmg_health: 100 },
    ];
    events['bomb_planted'] = [{ tick: 200 }];
    mockedParseTicks.mockReturnValue([row(100, '1', 3), row(100, '2', 2), row(164, '1', 3)]);

    const data = await new Demoparser2Adapter().parse('/tmp/match.dem');

    expect(data.map).toBe('de_test');
    expect(data.tickRate).toBe(64);
    expect(data.sampleRateHz).toBe(SAMPLE_RATE_HZ);
    expect(data.rounds).toHaveLength(1);
    expect(data.rounds[0]).toMatchObject({ winner: 'CT', durationSeconds: 2 });
    expect(data.rounds[0]?.kills).toHaveLength(1);
    expect(data.rounds[0]?.bomb.plantedAt).toBeCloseTo(100 / 64);
    expect(data.players).toEqual({ '1': 'P1', '2': 'P2' });
  });

  it('asks the parser only for the sampled ticks of each round', async () => {
    events['round_freeze_end'] = [{ tick: 0 }];
    events['round_end'] = [{ tick: 24, winner: 'T' }];
    mockedParseTicks.mockReturnValue([row(0, '1', 2)]);

    await new Demoparser2Adapter().parse('/tmp/match.dem');

    const [path, props, ticks] = mockedParseTicks.mock.calls[0]!;
    expect(path).toBe('/tmp/match.dem');
    expect(props).toEqual(['X', 'Y', 'Z', 'yaw', 'health', 'team_num']);
    expect(ticks).toEqual([0, 8, 16, 24]);
  });

  it('fails with NO_ROUNDS when the demo contains no completed round', async () => {
    events['round_freeze_end'] = [{ tick: 100 }];
    await expect(new Demoparser2Adapter().parse('x.dem')).rejects.toMatchObject({
      code: 'NO_ROUNDS',
    });
  });

  it('wraps unexpected parser errors in a PARSE_FAILED error', async () => {
    (parseHeader as jest.Mock).mockImplementation(() => {
      throw new Error('corrupted file');
    });
    const error = await new Demoparser2Adapter().parse('x.dem').catch((e) => e);
    expect(error).toBeInstanceOf(DemoParseError);
    expect(error.code).toBe('PARSE_FAILED');
    expect((error.cause as Error).message).toBe('corrupted file');
  });
});
