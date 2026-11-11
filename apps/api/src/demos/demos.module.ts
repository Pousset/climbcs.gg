import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CLOCK, systemClock } from '../common/clock';
import { Demo } from './demo.entity';
import { DemoQuotaService } from './demo-quota.service';
import { DemosService } from './demos.service';
import { DEMO_PARSER } from './parsing/demo-parser.port';
import { Demoparser2Adapter } from './parsing/demoparser2.adapter';
import { FileReplayStore, REPLAY_STORE } from './replay.store';

@Module({
  imports: [TypeOrmModule.forFeature([Demo]), AuthModule],
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
