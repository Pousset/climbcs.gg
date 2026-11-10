import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { User } from '../users/user.entity';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import type { PasswordService } from './password.service';

const stored = {
  id: 'u1',
  username: 'Alice',
  usernameKey: 'alice',
  passwordHash: 'stored-hash',
  plan: 'free',
  createdAt: new Date('2026-01-01T00:00:00Z'),
} as User;

function build() {
  const users = { create: jest.fn(), findByUsername: jest.fn() };
  const passwords = {
    hash: jest.fn(async (plain: string) => `hashed:${plain}`),
    verify: jest.fn(async (plain: string, hash: string) => hash === `hashed:${plain}`),
  };
  const jwt = { signAsync: jest.fn(async () => 'signed-token') };
  const service = new AuthService(
    users as unknown as UsersService,
    passwords as unknown as PasswordService,
    jwt as unknown as JwtService,
  );
  return { service, users, passwords, jwt };
}

describe('AuthService', () => {
  it('registers a user with a hashed password and returns a token', async () => {
    const { service, users, passwords, jwt } = build();
    users.create.mockResolvedValue(stored);
    const result = await service.register({ username: 'Alice', password: 'password1' });
    expect(passwords.hash).toHaveBeenCalledWith('password1');
    expect(users.create).toHaveBeenCalledWith('Alice', 'hashed:password1');
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u1' });
    expect(result.accessToken).toBe('signed-token');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('propagates a duplicate username conflict', async () => {
    const { service, users } = build();
    users.create.mockRejectedValue(new ConflictException());
    await expect(service.register({ username: 'Alice', password: 'password1' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('logs in with valid credentials', async () => {
    const { service, users } = build();
    users.findByUsername.mockResolvedValue({ ...stored, passwordHash: 'hashed:password1' });
    const result = await service.login({ username: 'alice', password: 'password1' });
    expect(result.user.username).toBe('Alice');
  });

  it('rejects a wrong password and an unknown user with the same error', async () => {
    const { service, users, passwords } = build();
    users.findByUsername.mockResolvedValueOnce({ ...stored, passwordHash: 'hashed:other' });
    const wrong = await service.login({ username: 'alice', password: 'nope' }).catch((e) => e);
    users.findByUsername.mockResolvedValueOnce(null);
    const unknown = await service.login({ username: 'ghost', password: 'nope' }).catch((e) => e);
    expect(wrong).toBeInstanceOf(UnauthorizedException);
    expect(unknown).toBeInstanceOf(UnauthorizedException);
    expect(wrong.message).toBe(unknown.message);
    expect(passwords.verify).toHaveBeenCalledTimes(2);
  });
});
