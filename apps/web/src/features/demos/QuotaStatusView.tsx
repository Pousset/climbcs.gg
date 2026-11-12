import type { QuotaStatus } from '@cs2/core';
import { formatDuration } from '../../lib/format';

export function describeQuota(quota: QuotaStatus, now: Date): string {
  if (quota.plan === 'premium') return 'Premium : analyses illimitées.';
  if (quota.allowed) return 'Ta démo gratuite du jour est disponible.';
  const remainingMs = new Date(quota.resetsAt).getTime() - now.getTime();
  return `Démo gratuite du jour utilisée. Prochaine analyse dans ${formatDuration(remainingMs)}.`;
}

export function QuotaStatusView({ quota, now = new Date() }: { quota: QuotaStatus; now?: Date }) {
  return (
    <p className={`quota quota--${quota.allowed ? 'open' : 'closed'}`} role="status">
      {describeQuota(quota, now)}
    </p>
  );
}
