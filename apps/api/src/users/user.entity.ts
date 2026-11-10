import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { Plan } from '@cs2/core';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Username as typed by the user (display form). */
  @Column({ type: 'varchar', length: 32 })
  username!: string;

  /** Lower-cased username, used for case-insensitive uniqueness. */
  @Column({ type: 'varchar', length: 32, unique: true })
  usernameKey!: string;

  @Column({ type: 'varchar', length: 100 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 16, default: 'free' })
  plan!: Plan;

  @CreateDateColumn()
  createdAt!: Date;
}

/** User fields that are safe to expose over the API. */
export interface PublicUser {
  id: string;
  username: string;
  plan: Plan;
  createdAt: string;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    plan: user.plan,
    createdAt: user.createdAt.toISOString(),
  };
}
