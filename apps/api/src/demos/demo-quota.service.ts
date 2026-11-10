import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FREE_DAILY_DEMO_LIMIT, evaluateQuota, utcDayKey } from '@cs2/core';
import type { QuotaStatus } from '@cs2/core';
import { Not, Repository } from 'typeorm';
import { CLOCK } from '../common/clock';
import type { Clock } from '../common/clock';
import type { User } from '../users/user.entity';
import { Demo } from './demo.entity';

/** Daily analysis quota. Failed demos never count: a broken file must not burn the free demo. */
@Injectable()
export class DemoQuotaService {
  constructor(
    @InjectRepository(Demo) private readonly demos: Repository<Demo>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async status(user: Pick<User, 'id' | 'plan'>): Promise<QuotaStatus> {
    const now = this.clock();
    const used = await this.demos.count({
      where: { userId: user.id, dayKey: utcDayKey(now), status: Not('failed') },
    });
    return evaluateQuota(user.plan, used, now);
  }

  /**
   * Re-checks a freshly inserted demo against the quota. Two concurrent uploads can both pass
   * {@link status}; ranking the day's demos in a stable order guarantees only the first
   * `FREE_DAILY_DEMO_LIMIT` survive, whatever the interleaving.
   */
  async isWithinQuota(user: Pick<User, 'id' | 'plan'>, demo: Demo): Promise<boolean> {
    if (user.plan === 'premium') return true;
    const allowed = await this.demos.find({
      select: { id: true },
      where: { userId: user.id, dayKey: demo.dayKey, status: Not('failed') },
      order: { createdAt: 'ASC', id: 'ASC' },
      take: FREE_DAILY_DEMO_LIMIT,
    });
    return allowed.some((d) => d.id === demo.id);
  }
}
