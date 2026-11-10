import type { Plan } from './types';

/** Number of demos a free account may analyse per UTC day. */
export const FREE_DAILY_DEMO_LIMIT = 1;

export interface QuotaStatus {
  plan: Plan;
  /** `null` means unlimited. */
  limit: number | null;
  used: number;
  /** `null` means unlimited. */
  remaining: number | null;
  allowed: boolean;
  /** ISO timestamp of the next quota reset (next UTC midnight). */
  resetsAt: string;
}

/** Calendar day (UTC) as `YYYY-MM-DD`, used to bucket daily usage. */
export function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function nextUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
}

export function evaluateQuota(plan: Plan, usedToday: number, now: Date): QuotaStatus {
  const used = Math.max(0, Math.floor(usedToday));
  const resetsAt = nextUtcMidnight(now).toISOString();
  if (plan === 'premium') {
    return { plan, limit: null, used, remaining: null, allowed: true, resetsAt };
  }
  return {
    plan,
    limit: FREE_DAILY_DEMO_LIMIT,
    used,
    remaining: Math.max(FREE_DAILY_DEMO_LIMIT - used, 0),
    allowed: used < FREE_DAILY_DEMO_LIMIT,
    resetsAt,
  };
}
