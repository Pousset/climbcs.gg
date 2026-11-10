import { Body, Controller, Get, Inject, NotFoundException, Put, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { APP_CONFIG } from '../config/env';
import type { AppConfig } from '../config/env';
import { toPublicUser } from '../users/user.entity';
import type { PublicUser, User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { setPlanSchema } from './account.schemas';
import type { SetPlanInput } from './account.schemas';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(
    private readonly users: UsersService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get('me')
  me(@CurrentUser() user: User): PublicUser {
    return toPublicUser(user);
  }

  /**
   * Simulated subscription for the V1 product demo. It only exists when
   * ENABLE_DEV_PLAN_SWITCH=true and answers 404 otherwise; Stripe replaces it in V2.
   */
  @Put('me/plan')
  async setPlan(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(setPlanSchema)) body: SetPlanInput,
  ): Promise<PublicUser> {
    if (!this.config.devPlanSwitch) throw new NotFoundException();
    return toPublicUser(await this.users.setPlan(user.id, body.plan));
  }
}
