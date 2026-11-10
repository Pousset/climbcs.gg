import { Inject, Injectable } from '@nestjs/common';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzip, gzip } from 'node:zlib';
import { promisify } from 'node:util';
import type { ReplayData } from '@cs2/core';
import { APP_CONFIG } from '../config/env';
import type { AppConfig } from '../config/env';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/** Persistence of parsed replays (kept out of the SQL database: they are large documents). */
export interface ReplayStore {
  save(demoId: string, data: ReplayData): Promise<void>;
  load(demoId: string): Promise<ReplayData | null>;
  delete(demoId: string): Promise<void>;
}

export const REPLAY_STORE = Symbol('REPLAY_STORE');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Stores each replay as a gzipped JSON file under `<storageDir>/replays`. */
@Injectable()
export class FileReplayStore implements ReplayStore {
  private readonly dir: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.dir = join(config.storageDir, 'replays');
  }

  async save(demoId: string, data: ReplayData): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.pathFor(demoId), await gzipAsync(JSON.stringify(data)));
  }

  async load(demoId: string): Promise<ReplayData | null> {
    try {
      const compressed = await readFile(this.pathFor(demoId));
      return JSON.parse((await gunzipAsync(compressed)).toString('utf8')) as ReplayData;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async delete(demoId: string): Promise<void> {
    await rm(this.pathFor(demoId), { force: true });
  }

  /** Only UUIDs are accepted, which rules out path traversal through the id. */
  private pathFor(demoId: string): string {
    if (!UUID.test(demoId)) throw new Error(`Invalid demo id: ${demoId}`);
    return join(this.dir, `${demoId}.json.gz`);
  }
}
