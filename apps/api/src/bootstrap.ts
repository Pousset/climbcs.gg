import type { INestApplication } from '@nestjs/common';
import type { AppConfig } from './config/env';

export const API_PREFIX = 'api';

/** Cross-cutting HTTP setup shared by the real server and the e2e tests. */
export function configureApp(app: INestApplication, config: AppConfig): void {
  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({ origin: config.corsOrigin });
  app.enableShutdownHooks();
}
