import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { loadEnv } from './config/env';
import type { AppConfig } from './config/env';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';

@Module({})
export class AppModule {
  static forRoot(config: AppConfig = loadEnv(process.env)): DynamicModule {
    return {
      module: AppModule,
      imports: [ConfigModule.forRoot(config), DatabaseModule, AuthModule],
      controllers: [HealthController],
    };
  }
}
