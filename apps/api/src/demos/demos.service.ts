import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { open, rm } from 'node:fs/promises';
import {
  buildReport,
  computeScoreboard,
  gateReport,
  getRoundTeams,
  PlayerNotFoundError,
  utcDayKey,
} from '@cs2/core';
import type { GatedReport, PlayerStats, ReplayData, Team } from '@cs2/core';
import { Repository } from 'typeorm';
import { CLOCK } from '../common/clock';
import type { Clock } from '../common/clock';
import { KeyedMutex } from '../common/keyed-mutex';
import { APP_CONFIG } from '../config/env';
import type { AppConfig } from '../config/env';
import type { User } from '../users/user.entity';
import { Demo } from './demo.entity';
import { DemoQuotaService } from './demo-quota.service';
import { DemoValidationError, validateDemoUpload } from './demo-upload.validator';
import { DEMO_PARSER, DemoParseError } from './parsing/demo-parser.port';
import type { DemoParser } from './parsing/demo-parser.port';
import { REPLAY_STORE } from './replay.store';
import type { ReplayStore } from './replay.store';

/** File as stored on disk by the upload middleware. */
export interface UploadedDemoFile {
  path: string;
  originalname: string;
  size: number;
}

export type ScoreboardRow = Pick<
  PlayerStats,
  'id' | 'name' | 'rounds' | 'kills' | 'deaths' | 'assists' | 'kd' | 'adr' | 'hsPercent'
> & { team: Team | null };

async function readHeader(path: string, length = 8): Promise<Buffer> {
  const handle = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

@Injectable()
export class DemosService implements OnModuleDestroy {
  private readonly logger = new Logger(DemosService.name);
  private readonly userLock = new KeyedMutex();
  private readonly pending = new Set<Promise<void>>();

  constructor(
    @InjectRepository(Demo) private readonly demos: Repository<Demo>,
    private readonly quota: DemoQuotaService,
    @Inject(DEMO_PARSER) private readonly parser: DemoParser,
    @Inject(REPLAY_STORE) private readonly store: ReplayStore,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Resolves when every background analysis has finished (tests, graceful shutdown). */
  async whenIdle(): Promise<void> {
    await Promise.allSettled([...this.pending]);
  }

  onModuleDestroy(): Promise<void> {
    return this.whenIdle();
  }

  /**
   * Accepts an uploaded demo: enforces the daily quota, validates the file, records the demo
   * and analyses it in the background. The uploaded file is always removed afterwards.
   */
  async submit(user: User, file: UploadedDemoFile): Promise<Demo> {
    try {
      const demo = await this.userLock.run(user.id, () => this.accept(user, file));
      this.track(this.analyse(demo.id, file.path));
      return demo;
    } catch (error) {
      await rm(file.path, { force: true });
      throw error;
    }
  }

  private async accept(user: User, file: UploadedDemoFile): Promise<Demo> {
    const status = await this.quota.status(user);
    if (!status.allowed) {
      throw new ForbiddenException({
        code: 'DAILY_QUOTA_EXCEEDED',
        message: 'Daily free demo already used',
        resetsAt: status.resetsAt,
      });
    }
    try {
      validateDemoUpload(
        {
          originalName: file.originalname,
          size: file.size,
          header: await readHeader(file.path),
        },
        this.config.maxDemoBytes,
      );
    } catch (error) {
      if (error instanceof DemoValidationError) {
        throw new BadRequestException({ code: error.code, message: 'Invalid demo file' });
      }
      throw error;
    }
    return this.demos.save(
      this.demos.create({
        userId: user.id,
        originalName: file.originalname.slice(0, 255),
        sizeBytes: file.size,
        status: 'processing',
        dayKey: utcDayKey(this.clock()),
      }),
    );
  }

  private track(work: Promise<void>): void {
    this.pending.add(work);
    void work.finally(() => this.pending.delete(work));
  }

  private async analyse(demoId: string, path: string): Promise<void> {
    try {
      const replay = await this.parser.parse(path);
      await this.store.save(demoId, replay);
      await this.demos.update(demoId, {
        status: 'ready',
        map: replay.map,
        roundCount: replay.rounds.length,
        errorCode: null,
      });
    } catch (error) {
      const errorCode = error instanceof DemoParseError ? error.code : 'PARSE_FAILED';
      if (!(error instanceof DemoParseError)) {
        this.logger.error(`Analysis of demo ${demoId} failed`, error as Error);
      }
      await this.demos.update(demoId, { status: 'failed', errorCode });
    } finally {
      await rm(path, { force: true });
    }
  }

  quotaFor(user: User) {
    return this.quota.status(user);
  }

  list(user: User): Promise<Demo[]> {
    return this.demos.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC', id: 'ASC' },
      take: 50,
    });
  }

  async getOwned(user: User, id: string): Promise<Demo> {
    const demo = await this.demos.findOne({ where: { id, userId: user.id } });
    if (!demo) throw new NotFoundException('Demo not found');
    return demo;
  }

  async delete(user: User, id: string): Promise<void> {
    const demo = await this.getOwned(user, id);
    await this.store.delete(demo.id);
    await this.demos.remove(demo);
  }

  async getReplay(user: User, id: string): Promise<ReplayData> {
    const demo = await this.getOwned(user, id);
    if (demo.status !== 'ready') {
      throw new ConflictException({ code: 'DEMO_NOT_READY', status: demo.status });
    }
    const replay = await this.store.load(demo.id);
    if (!replay) throw new NotFoundException('Replay data is no longer available');
    return replay;
  }

  async getScoreboard(user: User, id: string): Promise<ScoreboardRow[]> {
    const replay = await this.getReplay(user, id);
    const teams = replay.rounds[0] ? getRoundTeams(replay.rounds[0]) : new Map<string, Team>();
    return computeScoreboard(replay).map((p) => ({
      id: p.id,
      name: p.name,
      team: teams.get(p.id) ?? null,
      rounds: p.rounds,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      kd: p.kd,
      adr: p.adr,
      hsPercent: p.hsPercent,
    }));
  }

  async getReport(user: User, id: string, playerId: string): Promise<GatedReport> {
    const replay = await this.getReplay(user, id);
    try {
      return gateReport(buildReport(replay, playerId), user.plan);
    } catch (error) {
      if (error instanceof PlayerNotFoundError) throw new NotFoundException('Player not found');
      throw error;
    }
  }
}
