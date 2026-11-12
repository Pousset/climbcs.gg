import type { QuotaStatus } from '@cs2/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { describeQuota, QuotaStatusView } from './QuotaStatusView';

const now = new Date('2026-11-13T18:48:00.000Z');
const free = (over: Partial<QuotaStatus> = {}): QuotaStatus => ({
  plan: 'free',
  limit: 1,
  used: 0,
  remaining: 1,
  allowed: true,
  resetsAt: '2026-11-14T00:00:00.000Z',
  ...over,
});

describe('describeQuota', () => {
  it('announces the available free demo', () => {
    expect(describeQuota(free(), now)).toBe('Ta démo gratuite du jour est disponible.');
  });

  it('tells when the next analysis will be possible', () => {
    expect(describeQuota(free({ used: 1, remaining: 0, allowed: false }), now)).toBe(
      'Démo gratuite du jour utilisée. Prochaine analyse dans 5 h 12 min.',
    );
  });

  it('shows unlimited analyses for premium users', () => {
    expect(describeQuota(free({ plan: 'premium', limit: null, remaining: null }), now)).toMatch(
      /illimitées/,
    );
  });
});

describe('QuotaStatusView', () => {
  it('renders the message as a status region', () => {
    render(<QuotaStatusView quota={free()} now={now} />);
    expect(screen.getByRole('status')).toHaveTextContent('disponible');
  });
});
