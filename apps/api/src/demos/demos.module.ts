import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { diskStorage } from 'multer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CLOCK, systemClock } from '../common/clock';
import { APP_CONFIG } from '../config/env';
import type { AppConfig } from '../config/env';
import { Demo } from './demo.entity';
import { DemosController } from './demos.controller';
import { DemoQuotaService } from './demo-quota.service';
import { DemosService } from './demos.service';
import { DEMO_PARSER } from './parsing/demo-parser.port';
import { Demoparser2Adapter } from './parsing/demoparser2.adapter';
import { FileReplayStore, REPLAY_STORE } from './replay.store';

@Module({
  imports: [
    TypeOrmModule.forFeature([Demo]),
    AuthModule,
    MulterModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => {
        const destination = join(config.storageDir, 'uploads');
        mkdirSync(destination, { recursive: true });
        return {
          storage: diskStorage({
            destination,
            filename: (_req, _file, callback) => callback(null, `${randomUUID()}.upload`),
          }),
          limits: { fileSize: config.maxDemoBytes, files: 1 },
        };
      },
    }),
  ],
  controllers: [DemosController],
  providers: [
    DemosService,
    DemoQuotaService,
    { provide: CLOCK, useValue: systemClock },
    { provide: DEMO_PARSER, useClass: Demoparser2Adapter },
    { provide: REPLAY_STORE, useClass: FileReplayStore },
  ],
  exports: [DemosService],
})
export class DemosModule {}
