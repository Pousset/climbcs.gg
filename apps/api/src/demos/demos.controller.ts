import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { GatedReport, QuotaStatus, ReplayData } from '@cs2/core';
import { z } from 'zod';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { User } from '../users/user.entity';
import { toPublicDemo } from './demo.entity';
import type { PublicDemo } from './demo.entity';
import { DemosService } from './demos.service';
import type { ScoreboardRow } from './demos.service';

const reportQuerySchema = z.object({ player: z.string().trim().min(1).max(64) });
type ReportQuery = z.infer<typeof reportQuerySchema>;

@Controller('demos')
@UseGuards(JwtAuthGuard)
export class DemosController {
  constructor(private readonly demos: DemosService) {}

  /** Multipart upload (field `file`). Analysis runs in the background: poll `GET /demos/:id`. */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<PublicDemo> {
    if (!file)
      throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'Field "file" is required' });
    return toPublicDemo(await this.demos.submit(user, file));
  }

  @Get()
  async list(@CurrentUser() user: User): Promise<PublicDemo[]> {
    return (await this.demos.list(user)).map(toPublicDemo);
  }

  @Get('quota')
  quota(@CurrentUser() user: User): Promise<QuotaStatus> {
    return this.demos.quotaFor(user);
  }

  @Get(':id')
  async get(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PublicDemo> {
    return toPublicDemo(await this.demos.getOwned(user, id));
  }

  @Get(':id/replay')
  replay(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ReplayData> {
    return this.demos.getReplay(user, id);
  }

  @Get(':id/scoreboard')
  scoreboard(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ScoreboardRow[]> {
    return this.demos.getScoreboard(user, id);
  }

  @Get(':id/report')
  report(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: ReportQuery,
  ): Promise<GatedReport> {
    return this.demos.getReport(user, id, query.player);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.demos.delete(user, id);
  }
}
