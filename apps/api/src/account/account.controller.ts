import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { toPublicUser } from '../users/user.entity';
import type { PublicUser, User } from '../users/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class AccountController {
  @Get('me')
  me(@CurrentUser() user: User): PublicUser {
    return toPublicUser(user);
  }
}
