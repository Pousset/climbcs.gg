import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { loginSchema, registerSchema } from './auth.schemas';
import type { LoginInput, RegisterInput } from './auth.schemas';
import { AuthService } from './auth.service';
import type { AuthResult } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput): Promise<AuthResult> {
    return this.auth.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput): Promise<AuthResult> {
    return this.auth.login(body);
  }
}
