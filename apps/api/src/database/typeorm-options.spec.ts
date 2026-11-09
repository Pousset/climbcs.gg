import { loadEnv } from '../config/env';
import { buildTypeOrmOptions } from './typeorm-options';

describe('buildTypeOrmOptions', () => {
  it('uses better-sqlite3 with the configured path by default', () => {
    const options = buildTypeOrmOptions(loadEnv({ SQLITE_PATH: ':memory:' }));
    expect(options).toMatchObject({
      type: 'better-sqlite3',
      database: ':memory:',
      synchronize: true,
      autoLoadEntities: true,
    });
  });

  it('uses PostgreSQL with the connection URL when configured', () => {
    const options = buildTypeOrmOptions(
      loadEnv({ DB_TYPE: 'postgres', DATABASE_URL: 'postgres://u:p@db/app' }),
    );
    expect(options).toMatchObject({ type: 'postgres', url: 'postgres://u:p@db/app' });
  });

  it('never synchronises the schema in production', () => {
    const options = buildTypeOrmOptions(
      loadEnv({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(32) }),
    );
    expect(options.synchronize).toBe(false);
  });
});
