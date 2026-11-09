import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { AppConfig } from '../config/env';

/**
 * Maps the application configuration to TypeORM options.
 * SQLite is used for local development and tests, PostgreSQL for deployments.
 * Schema synchronisation is disabled in production: use migrations there.
 */
export function buildTypeOrmOptions(config: AppConfig): TypeOrmModuleOptions {
  const common = {
    autoLoadEntities: true,
    synchronize: config.nodeEnv !== 'production',
  } as const;
  if (config.database.type === 'postgres') {
    return { ...common, type: 'postgres', url: config.database.url };
  }
  return { ...common, type: 'better-sqlite3', database: config.database.path };
}
