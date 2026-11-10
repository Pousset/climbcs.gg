import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccountController } from './account.controller';

/** HTTP endpoints about the authenticated user's own account. */
@Module({ imports: [AuthModule], controllers: [AccountController] })
export class AccountModule {}
