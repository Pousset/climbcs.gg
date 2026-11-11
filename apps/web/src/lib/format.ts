/** Locale-independent French formatting helpers (deterministic output, easy to test). */

export function formatDecimal(value: number, digits = 2): string {
  return value.toFixed(digits).replace('.', ',');
}

/** Ratio in [0, 1] to a whole percentage, e.g. 0.724 -> "72 %". */
export function formatRatio(ratio: number): string {
  return `${Math.round(ratio * 100)} %`;
}

/** Percentage already expressed in [0, 100]. */
export function formatPercent(percent: number, digits = 0): string {
  return `${formatDecimal(percent, digits)} %`;
}

/** File size with French units (o, Ko, Mo, Go); one decimal below 10 units. */
export function formatBytes(bytes: number): string {
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1;
  return `${formatDecimal(value, digits)} ${units[unit]}`;
}

/** Seconds to `m:ss`. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/** Milliseconds to a short French duration such as "5 h 12 min" or "8 min". */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}
