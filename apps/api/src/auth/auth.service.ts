import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { toPublicUser } from '../users/user.entity';
import type { PublicUser, User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import type { LoginInput, RegisterInput } from './auth.schemas';
import { PasswordService } from './password.service';

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}

export interface JwtPayload {
  sub: string;
}

@Injectable()
export class AuthService {
  private dummyHash?: Promise<string>;

  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const user = await this.users.create(input.username, await this.passwords.hash(input.password));
    return this.issueToken(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.users.findByUsername(input.username);
    // Always run a hash comparison so unknown usernames cost the same as wrong passwords.
    this.dummyHash ??= this.passwords.hash('dummy-password-for-timing');
    const matches = await this.passwords.verify(
      input.password,
      user?.passwordHash ?? (await this.dummyHash),
    );
    if (!user || !matches) throw new UnauthorizedException('Invalid credentials');
    return this.issueToken(user);
  }

  private async issueToken(user: User): Promise<AuthResult> {
    const payload: JwtPayload = { sub: user.id };
    return { accessToken: await this.jwt.signAsync(payload), user: toPublicUser(user) };
  }
}
