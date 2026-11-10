import { Test } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CLOCK } from '../common/clock';
import { Demo } from './demo.entity';
import { DemoQuotaService } from './demo-quota.service';

describe('DemoQuotaService', () => {
  let service: DemoQuotaService;
  let repo: Repository<Demo>;
  let close: () => Promise<void>;
  let now = new Date('2026-11-13T10:00:00Z');
  const free = { id: 'user-free', plan: 'free' } as const;
  const premium = { id: 'user-premium', plan: 'premium' } as const;

  const addDemo = (userId: string, overrides: Partial<Demo> = {}) =>
    repo.save(
      repo.create({
        userId,
        originalName: 'a.dem',
        sizeBytes: 10,
        status: 'ready',
        dayKey: '2026-11-13',
        ...overrides,
      }),
    );

  beforeEach(async () => {
    now = new Date('2026-11-13T10:00:00Z');
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
      providers: [DemoQuotaService, { provide: CLOCK, useValue: () => now }],
    }).compile();
    service = moduleRef.get(DemoQuotaService);
    repo = moduleRef.get(getRepositoryToken(Demo));
    close = () => moduleRef.close();
  });

  afterEach(async () => {
    await close();
  });

  describe('status', () => {
    it('allows a free user with no demo today', async () => {
      expect(await service.status(free)).toMatchObject({ used: 0, remaining: 1, allowed: true });
    });

    it('blocks a free user who already analysed a demo today', async () => {
      await addDemo(free.id);
      expect(await service.status(free)).toMatchObject({ used: 1, remaining: 0, allowed: false });
    });

    it('does not count demos that failed, were made by others, or were made on another day', async () => {
      await addDemo(free.id, { status: 'failed' });
      await addDemo('someone-else');
      await addDemo(free.id, { dayKey: '2026-11-12' });
      expect((await service.status(free)).allowed).toBe(true);
    });

    it('counts processing demos so a second upload cannot start while one is running', async () => {
      await addDemo(free.id, { status: 'processing' });
      expect((await service.status(free)).allowed).toBe(false);
    });

    it('resets at the next UTC day', async () => {
      await addDemo(free.id);
      now = new Date('2026-11-14T00:00:01Z');
      expect((await service.status(free)).allowed).toBe(true);
    });

    it('never limits premium users', async () => {
      for (let i = 0; i < 3; i++) await addDemo(premium.id);
      expect(await service.status(premium)).toMatchObject({ allowed: true, limit: null, used: 3 });
    });
  });

  describe('isWithinQuota', () => {
    it('keeps the earliest demo of the day and rejects later ones', async () => {
      const first = await addDemo(free.id, { createdAt: new Date('2026-11-13T09:00:00Z') });
      const second = await addDemo(free.id, { createdAt: new Date('2026-11-13T09:00:05Z') });
      expect(await service.isWithinQuota(free, first)).toBe(true);
      expect(await service.isWithinQuota(free, second)).toBe(false);
    });

    it('keeps exactly one demo when two were created at the same instant', async () => {
      const at = new Date('2026-11-13T09:00:00Z');
      const a = await addDemo(free.id, { createdAt: at });
      const b = await addDemo(free.id, { createdAt: at });
      const results = [await service.isWithinQuota(free, a), await service.isWithinQuota(free, b)];
      expect(results.filter(Boolean)).toHaveLength(1);
    });

    it('always accepts premium users', async () => {
      await addDemo(premium.id);
      const extra = await addDemo(premium.id);
      expect(await service.isWithinQuota(premium, extra)).toBe(true);
    });
  });
});
