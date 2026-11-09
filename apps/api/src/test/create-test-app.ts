import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { configureApp } from '../bootstrap';
import { loadEnv } from '../config/env';
import type { AppConfig } from '../config/env';

/** Test configuration: in-memory SQLite and a throw-away storage directory. */
export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    ...loadEnv({
      NODE_ENV: 'test',
      SQLITE_PATH: ':memory:',
      JWT_SECRET: 'test-secret-test-secret',
      STORAGE_DIR: mkdtempSync(join(tmpdir(), 'cs2-api-')),
    }),
    ...overrides,
  };
}

export async function createTestApp(
  overrides: Partial<AppConfig> = {},
): Promise<{ app: INestApplication; config: AppConfig }> {
  const config = testConfig(overrides);
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot(config)],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app, config);
  await app.init();
  return { app, config };
}
