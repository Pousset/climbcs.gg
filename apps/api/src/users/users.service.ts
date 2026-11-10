import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Plan } from '@cs2/core';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from './user.entity';

export const normalizeUsername = (username: string): string => username.trim().toLowerCase();

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async create(username: string, passwordHash: string): Promise<User> {
    const usernameKey = normalizeUsername(username);
    if (await this.users.exists({ where: { usernameKey } })) {
      throw new ConflictException('Username already taken');
    }
    try {
      return await this.users.save(
        this.users.create({ username: username.trim(), usernameKey, passwordHash }),
      );
    } catch (error) {
      // Lost a race against a concurrent registration: the unique index still protects us.
      if (error instanceof QueryFailedError && /unique/i.test(error.message)) {
        throw new ConflictException('Username already taken');
      }
      throw error;
    }
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.users.findOne({ where: { usernameKey: normalizeUsername(username) } });
  }

  async setPlan(id: string, plan: Plan): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    user.plan = plan;
    return this.users.save(user);
  }
}
