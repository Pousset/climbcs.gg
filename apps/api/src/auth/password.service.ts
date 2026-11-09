import { Inject, Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { APP_CONFIG } from '../config/env';
import type { AppConfig } from '../config/env';

@Injectable()
export class PasswordService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  hash(plain: string): Promise<string> {
    return hash(plain, this.config.bcryptRounds);
  }

  verify(plain: string, hashed: string): Promise<boolean> {
    return compare(plain, hashed);
  }
}
