import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateSampleReplay, SAMPLE_PLAYER_ID } from '@cs2/core';
import type { ReplayData } from '@cs2/core';
import type { Repository } from 'typeorm';
import { CLOCK } from '../common/clock';
import { testConfig } from '../test/create-test-app';
import { APP_CONFIG } from '../config/env';
import type { User } from '../users/user.entity';
import { Demo } from './demo.entity';
import { DemoQuotaService } from './demo-quota.service';
import { CS2_DEMO_MAGIC } from './demo-upload.validator';
import { DemosService } from './demos.service';
import { DEMO_PARSER, DemoParseError } from './parsing/demo-parser.port';
import { REPLAY_STORE } from './replay.store';
import type { ReplayStore } from './replay.store';

class MemoryReplayStore implements ReplayStore {
  readonly data = new Map<string, ReplayData>();
  async save(id: string, data: ReplayData) {
    this.data.set(id, data);
  }
  async load(id: string) {
    return this.data.get(id) ?? null;
  }
  async delete(id: string) {
    this.data.delete(id);
  }
}

const exists = (path: string) =>
  stat(path).then(
    () => true,
    () => false,
  );

describe('DemosService', () => {
  let service: DemosService;
  let repo: Repository<Demo>;
  let store: MemoryReplayStore;
  let parse: jest.Mock;
  let dir: string;
  let now: Date;
  let close: () => Promise<void>;
  let counter = 0;

  const user = (id: string, plan: 'free' | 'premium' = 'free') => ({ id, plan }) as User;
  const alice = user('alice');
  const bob = user('bob');

  const upload = async (name = 'match.dem', content = `${CS2_DEMO_MAGIC}${'x'.repeat(64)}`) => {
    const path = join(dir, `upload-${counter++}.tmp`);
    await writeFile(path, content, 'latin1');
    return { path, originalname: name, size: Buffer.byteLength(content, 'latin1') };
  };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cs2-demos-'));
    now = new Date('2026-11-13T10:00:00Z');
    store = new MemoryReplayStore();
    parse = jest.fn(async () => generateSampleReplay());
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [Demo],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Demo]),
      ],
      providers: [
        DemosService,
        DemoQuotaService,
        { provide: CLOCK, useValue: () => now },
        { provide: DEMO_PARSER, useValue: { parse } },
        { provide: REPLAY_STORE, useValue: store },
        { provide: APP_CONFIG, useValue: testConfig({ maxDemoBytes: 10_000 }) },
      ],
    }).compile();
    service = moduleRef.get(DemosService);
    repo = moduleRef.get(getRepositoryToken(Demo));
    close = () => moduleRef.close();
  });

  afterEach(async () => {
    await close();
    await rm(dir, { recursive: true, force: true });
  });

  describe('submit', () => {
    it('records the demo, analyses it in the background and cleans the upload', async () => {
      const file = await upload('final.dem');
      const demo = await service.submit(alice, file);
      expect(demo).toMatchObject({
        userId: 'alice',
        originalName: 'final.dem',
        status: 'processing',
        dayKey: '2026-11-13',
      });

      await service.whenIdle();
      const saved = await repo.findOneByOrFail({ id: demo.id });
      expect(saved).toMatchObject({
        status: 'ready',
        map: 'sample_arena',
        roundCount: 3,
        errorCode: null,
      });
      expect(store.data.has(demo.id)).toBe(true);
      expect(parse).toHaveBeenCalledWith(file.path);
      expect(await exists(file.path)).toBe(false);
    });

    it('rejects an invalid file with a coded 400, removes it and keeps the quota', async () => {
      const file = await upload('notes.txt');
      await expect(service.submit(alice, file)).rejects.toMatchObject({
        response: { code: 'INVALID_EXTENSION' },
      });
      expect(await exists(file.path)).toBe(false);
      expect(await repo.count()).toBe(0);
      const ok = await service.submit(alice, await upload());
      expect(ok.status).toBe('processing');
    });

    it('rejects a file with a wrong header and an oversized file', async () => {
      await expect(
        service.submit(alice, await upload('a.dem', 'not a demo at all')),
      ).rejects.toBeInstanceOf(BadRequestException);
      const big = await upload('big.dem', `${CS2_DEMO_MAGIC}${'x'.repeat(20_000)}`);
      await expect(service.submit(alice, big)).rejects.toMatchObject({
        response: { code: 'FILE_TOO_LARGE' },
      });
    });

    it('blocks a second demo on the same day for a free user and removes the file', async () => {
      await service.submit(alice, await upload());
      const second = await upload();
      const error = await service.submit(alice, second).catch((e) => e);
      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.getResponse()).toMatchObject({
        code: 'DAILY_QUOTA_EXCEEDED',
        resetsAt: '2026-11-14T00:00:00.000Z',
      });
      expect(await exists(second.path)).toBe(false);
      await service.whenIdle();
    });

    it('allows another demo the next UTC day', async () => {
      await service.submit(alice, await upload());
      await service.whenIdle();
      now = new Date('2026-11-14T00:00:05Z');
      await expect(service.submit(alice, await upload())).resolves.toMatchObject({
        dayKey: '2026-11-14',
      });
      await service.whenIdle();
    });

    it('does not limit premium users', async () => {
      const pro = user('pro', 'premium');
      for (let i = 0; i < 3; i++) await service.submit(pro, await upload());
      await service.whenIdle();
      expect(await repo.count({ where: { userId: 'pro' } })).toBe(3);
    });

    it('accepts exactly one of several simultaneous uploads from a free user', async () => {
      const files = await Promise.all([upload(), upload(), upload()]);
      const results = await Promise.allSettled(files.map((f) => service.submit(alice, f)));
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(await repo.count({ where: { userId: 'alice' } })).toBe(1);
      await service.whenIdle();
    });

    it('tracks quota per user', async () => {
      await service.submit(alice, await upload());
      await expect(service.submit(bob, await upload())).resolves.toBeDefined();
      await service.whenIdle();
    });
  });

  describe('failed analysis', () => {
    it('marks the demo as failed with the parser error code and frees the quota', async () => {
      parse.mockRejectedValueOnce(new DemoParseError('NO_ROUNDS'));
      const file = await upload();
      const demo = await service.submit(alice, file);
      await service.whenIdle();
      expect(await repo.findOneByOrFail({ id: demo.id })).toMatchObject({
        status: 'failed',
        errorCode: 'NO_ROUNDS',
      });
      expect(await exists(file.path)).toBe(false);
      await expect(service.submit(alice, await upload())).resolves.toBeDefined();
      await service.whenIdle();
    });

    it('reports unexpected errors as PARSE_FAILED', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      parse.mockRejectedValueOnce(new Error('segfault'));
      const demo = await service.submit(alice, await upload());
      await service.whenIdle();
      expect((await repo.findOneByOrFail({ id: demo.id })).errorCode).toBe('PARSE_FAILED');
    });
  });

  describe('reading demos', () => {
    let demoId: string;

    beforeEach(async () => {
      demoId = (await service.submit(alice, await upload())).id;
      await service.whenIdle();
    });

    it('lists only the owner demos, newest first', async () => {
      expect((await service.list(alice)).map((d) => d.id)).toEqual([demoId]);
      expect(await service.list(bob)).toEqual([]);
    });

    it("hides other users' demos behind a 404", async () => {
      await expect(service.getOwned(bob, demoId)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.getReplay(bob, demoId)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the replay of a ready demo and refuses one still processing', async () => {
      expect((await service.getReplay(alice, demoId)).rounds).toHaveLength(3);
      const processing = await repo.save(
        repo.create({
          userId: 'alice',
          originalName: 'p.dem',
          sizeBytes: 1,
          status: 'processing',
          dayKey: '2026-11-12',
        }),
      );
      await expect(service.getReplay(alice, processing.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('builds a scoreboard with teams and basic stats only', async () => {
      const board = await service.getScoreboard(alice, demoId);
      expect(board).toHaveLength(10);
      const aegis = board.find((p) => p.id === SAMPLE_PLAYER_ID)!;
      expect(aegis).toMatchObject({ name: 'Aegis', team: 'CT', rounds: 3 });
      expect(aegis).not.toHaveProperty('kast');
      expect(aegis).not.toHaveProperty('rating');
    });

    it('gates the report by plan', async () => {
      const free = await service.getReport(alice, demoId, SAMPLE_PLAYER_ID);
      expect(free).toMatchObject({ plan: 'free', kast: null, rating: { value: null } });
      const premium = await service.getReport(user('alice', 'premium'), demoId, SAMPLE_PLAYER_ID);
      expect(premium.plan).toBe('premium');
      expect(premium.kast).not.toBeNull();
      expect(premium.rating.value).toEqual(expect.any(Number));
    });

    it('answers 404 for an unknown player', async () => {
      await expect(service.getReport(alice, demoId, 'nobody')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deletes the demo and its replay', async () => {
      await service.delete(alice, demoId);
      expect(store.data.has(demoId)).toBe(false);
      await expect(service.getOwned(alice, demoId)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
