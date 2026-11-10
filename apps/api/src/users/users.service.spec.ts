import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { toPublicUser, User } from './user.entity';
import { normalizeUsername, UsersService } from './users.service';

describe('normalizeUsername', () => {
  it('trims and lower-cases', () => {
    expect(normalizeUsername('  MaThIs_42 ')).toBe('mathis_42');
  });
});

describe('UsersService', () => {
  let service: UsersService;
  let close: () => Promise<void>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [User],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User]),
      ],
      providers: [UsersService],
    }).compile();
    service = moduleRef.get(UsersService);
    close = () => moduleRef.close();
  });

  afterEach(async () => {
    await close();
  });

  it('creates a free user with a generated id', async () => {
    const user = await service.create('Mathis', 'hash');
    expect(user).toMatchObject({ username: 'Mathis', usernameKey: 'mathis', plan: 'free' });
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('rejects a duplicate username regardless of case', async () => {
    await service.create('Mathis', 'hash');
    await expect(service.create('mATHIS', 'other')).rejects.toBeInstanceOf(ConflictException);
  });

  it('finds users by id and by case-insensitive username', async () => {
    const user = await service.create('Alice', 'hash');
    expect((await service.findById(user.id))?.username).toBe('Alice');
    expect((await service.findByUsername('ALICE'))?.id).toBe(user.id);
  });

  it('returns null for unknown users', async () => {
    expect(await service.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
    expect(await service.findByUsername('ghost')).toBeNull();
  });

  it('changes the plan of an existing user', async () => {
    const user = await service.create('Bob', 'hash');
    const updated = await service.setPlan(user.id, 'premium');
    expect(updated.plan).toBe('premium');
    expect((await service.findById(user.id))?.plan).toBe('premium');
  });

  it('fails to change the plan of an unknown user', async () => {
    await expect(
      service.setPlan('00000000-0000-0000-0000-000000000000', 'premium'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('toPublicUser', () => {
  it('never exposes the password hash or the lookup key', () => {
    const user = Object.assign(new User(), {
      id: 'u1',
      username: 'Alice',
      usernameKey: 'alice',
      passwordHash: 'secret-hash',
      plan: 'free' as const,
      createdAt: new Date('2026-01-02T03:04:05.000Z'),
    });
    const publicUser = toPublicUser(user);
    expect(publicUser).toEqual({
      id: 'u1',
      username: 'Alice',
      plan: 'free',
      createdAt: '2026-01-02T03:04:05.000Z',
    });
    expect(JSON.stringify(publicUser)).not.toContain('secret-hash');
  });
});
