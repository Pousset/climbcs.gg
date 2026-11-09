import { loadEnv } from './env';

describe('loadEnv', () => {
  it('provides safe development defaults', () => {
    const config = loadEnv({});
    expect(config).toMatchObject({
      nodeEnv: 'development',
      port: 3000,
      database: { type: 'sqlite', path: './storage/dev.sqlite' },
      storageDir: './storage',
      devPlanSwitch: false,
      corsOrigin: 'http://localhost:5173',
    });
    expect(config.maxDemoBytes).toBe(512 * 1024 * 1024);
    expect(config.jwt.secret.length).toBeGreaterThanOrEqual(16);
  });

  it('coerces numeric and boolean variables', () => {
    const config = loadEnv({
      PORT: '8080',
      MAX_DEMO_SIZE_MB: '10',
      ENABLE_DEV_PLAN_SWITCH: 'true',
    });
    expect(config.port).toBe(8080);
    expect(config.maxDemoBytes).toBe(10 * 1024 * 1024);
    expect(config.devPlanSwitch).toBe(true);
  });

  it('selects PostgreSQL when requested and a URL is given', () => {
    const config = loadEnv({ DB_TYPE: 'postgres', DATABASE_URL: 'postgres://u:p@db:5432/app' });
    expect(config.database).toEqual({ type: 'postgres', url: 'postgres://u:p@db:5432/app' });
  });

  it('requires DATABASE_URL for PostgreSQL', () => {
    expect(() => loadEnv({ DB_TYPE: 'postgres' })).toThrow(/DATABASE_URL/);
  });

  it('requires a JWT secret in production', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
    const config = loadEnv({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(32) });
    expect(config.jwt.secret).toBe('x'.repeat(32));
  });

  it('rejects a short JWT secret', () => {
    expect(() => loadEnv({ JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('rejects invalid values with a readable message', () => {
    expect(() => loadEnv({ PORT: 'abc' })).toThrow(/Invalid environment configuration/);
    expect(() => loadEnv({ DB_TYPE: 'mysql' })).toThrow(/DB_TYPE/);
    expect(() => loadEnv({ PORT: '70000' })).toThrow(/PORT/);
  });
});
