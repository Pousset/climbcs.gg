import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion } from './motion';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('prefersReducedMotion', () => {
  it('is false when matchMedia is not available', () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it('reflects the media query result', () => {
    const matchMedia = vi.fn((query: string) => ({ matches: query.includes('reduce') }));
    vi.stubGlobal('matchMedia', matchMedia);
    expect(prefersReducedMotion()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(prefersReducedMotion()).toBe(false);
  });
});
