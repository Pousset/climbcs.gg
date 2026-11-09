import { z } from 'zod';

const booleanFlag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DB_TYPE: z.enum(['sqlite', 'postgres']).default('sqlite'),
    DATABASE_URL: z.string().min(1).optional(),
    SQLITE_PATH: z.string().min(1).default('./storage/dev.sqlite'),
    JWT_SECRET: z.string().min(16).optional(),
    JWT_EXPIRES_IN: z.string().min(1).default('7d'),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
    STORAGE_DIR: z.string().min(1).default('./storage'),
    MAX_DEMO_SIZE_MB: z.coerce.number().int().positive().default(512),
    ENABLE_DEV_PLAN_SWITCH: booleanFlag,
    CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.JWT_SECRET) {
      ctx.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'required in production' });
    }
    if (env.DB_TYPE === 'postgres' && !env.DATABASE_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'required when DB_TYPE=postgres',
      });
    }
  });

export type DatabaseConfig = { type: 'sqlite'; path: string } | { type: 'postgres'; url: string };

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  database: DatabaseConfig;
  jwt: { secret: string; expiresIn: string };
  bcryptRounds: number;
  storageDir: string;
  maxDemoBytes: number;
  devPlanSwitch: boolean;
  corsOrigin: string;
}

/** Injection token for the validated application configuration. */
export const APP_CONFIG = Symbol('APP_CONFIG');

const DEV_JWT_SECRET = 'dev-only-secret-change-me-please';

/** Validates raw environment variables and returns a typed configuration. */
export function loadEnv(raw: NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  const env = parsed.data;
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    database:
      env.DB_TYPE === 'postgres'
        ? { type: 'postgres', url: env.DATABASE_URL! }
        : { type: 'sqlite', path: env.SQLITE_PATH },
    jwt: { secret: env.JWT_SECRET ?? DEV_JWT_SECRET, expiresIn: env.JWT_EXPIRES_IN },
    bcryptRounds: env.BCRYPT_ROUNDS,
    storageDir: env.STORAGE_DIR,
    maxDemoBytes: env.MAX_DEMO_SIZE_MB * 1024 * 1024,
    devPlanSwitch: env.ENABLE_DEV_PLAN_SWITCH,
    corsOrigin: env.CORS_ORIGIN,
  };
}
