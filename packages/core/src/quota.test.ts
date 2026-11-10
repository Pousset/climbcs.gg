import { describe, expect, it } from 'vitest';
import { evaluateQuota, FREE_DAILY_DEMO_LIMIT, nextUtcMidnight, utcDayKey } from './quota';

const now = new Date('2026-11-13T15:30:00.000Z');

describe('utcDayKey', () => {
  it('formats the UTC calendar day', () => {
    expect(utcDayKey(now)).toBe('2026-11-13');
  });

  it('uses UTC, not local time, around midnight', () => {
    expect(utcDayKey(new Date('2026-11-13T23:59:59.999Z'))).toBe('2026-11-13');
    expect(utcDayKey(new Date('2026-11-14T00:00:00.000Z'))).toBe('2026-11-14');
  });
});

describe('nextUtcMidnight', () => {
  it('returns the start of the next UTC day', () => {
    expect(nextUtcMidnight(now).toISOString()).toBe('2026-11-14T00:00:00.000Z');
  });

  it('rolls over month and year boundaries', () => {
    expect(nextUtcMidnight(new Date('2026-11-30T10:00:00Z')).toISOString()).toBe(
      '2026-12-01T00:00:00.000Z',
    );
    expect(nextUtcMidnight(new Date('2026-12-31T23:59:59Z')).toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    );
  });
});

describe('evaluateQuota', () => {
  it('allows a free user who has not used the daily demo', () => {
    expect(evaluateQuota('free', 0, now)).toEqual({
      plan: 'free',
      limit: FREE_DAILY_DEMO_LIMIT,
      used: 0,
      remaining: 1,
      allowed: true,
      resetsAt: '2026-11-14T00:00:00.000Z',
    });
  });

  it('blocks a free user once the limit is reached', () => {
    const status = evaluateQuota('free', 1, now);
    expect(status).toMatchObject({ allowed: false, remaining: 0, used: 1 });
    expect(evaluateQuota('free', 5, now).remaining).toBe(0);
  });

  it('never blocks premium users and reports no limit', () => {
    expect(evaluateQuota('premium', 50, now)).toMatchObject({
      allowed: true,
      limit: null,
      remaining: null,
      used: 50,
    });
  });

  it('sanitises invalid usage counts', () => {
    expect(evaluateQuota('free', -3, now).used).toBe(0);
    expect(evaluateQuota('free', 0.9, now).used).toBe(0);
  });
});
