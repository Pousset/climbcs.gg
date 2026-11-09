import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { APP_CONFIG, loadEnv } from './env';
import type { AppConfig } from './env';

/** Exposes the validated {@link AppConfig} to every module through the APP_CONFIG token. */
@Global()
@Module({})
export class ConfigModule {
  static forRoot(config: AppConfig = loadEnv(process.env)): DynamicModule {
    return {
      module: ConfigModule,
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };
  }
}
