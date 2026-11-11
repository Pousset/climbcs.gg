import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  formatClock,
  formatDecimal,
  formatDuration,
  formatPercent,
  formatRatio,
} from './format';

describe('formatDecimal', () => {
  it('uses a decimal comma and the requested precision', () => {
    expect(formatDecimal(1.234)).toBe('1,23');
    expect(formatDecimal(1.5, 1)).toBe('1,5');
    expect(formatDecimal(3, 0)).toBe('3');
  });
});

describe('formatRatio / formatPercent', () => {
  it('rounds a ratio to a whole percentage', () => {
    expect(formatRatio(0.724)).toBe('72 %');
    expect(formatRatio(1)).toBe('100 %');
    expect(formatRatio(0)).toBe('0 %');
  });

  it('formats a value already in percent', () => {
    expect(formatPercent(41.666)).toBe('42 %');
    expect(formatPercent(41.666, 1)).toBe('41,7 %');
  });
});

describe('formatBytes', () => {
  it.each([
    [0, '0 o'],
    [512, '512 o'],
    [1536, '1,5 Ko'],
    [5 * 1024 * 1024, '5,0 Mo'],
    [120 * 1024 * 1024, '120 Mo'],
    [3 * 1024 ** 3, '3,0 Go'],
  ])('formats %d bytes as %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });

  it('never goes below zero', () => {
    expect(formatBytes(-5)).toBe('0 o');
  });
});

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [9.9, '0:09'],
    [65, '1:05'],
    [600, '10:00'],
    [-3, '0:00'],
  ])('formats %d seconds as %s', (seconds, expected) => {
    expect(formatClock(seconds)).toBe(expected);
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0 min'],
    [30_000, '1 min'],
    [8 * 60_000, '8 min'],
    [60 * 60_000, '1 h'],
    [(5 * 60 + 12) * 60_000, '5 h 12 min'],
  ])('formats %d ms as %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});
