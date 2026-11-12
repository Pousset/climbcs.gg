import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useReplayClock } from './useReplayClock';

let callbacks: Map<number, FrameRequestCallback>;
let nextId: number;

/** Runs every pending animation frame callback at the given timestamp. */
const flushFrame = (timestamp: number) => {
  const pending = [...callbacks.entries()];
  callbacks.clear();
  act(() => {
    for (const [, callback] of pending) callback(timestamp);
  });
};

beforeEach(() => {
  callbacks = new Map();
  nextId = 1;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useReplayClock', () => {
  it('starts paused at time zero', () => {
    const { result } = renderHook(() => useReplayClock(60));
    expect(result.current).toMatchObject({ time: 0, playing: false, speed: 1 });
    expect(callbacks.size).toBe(0);
  });

  it('advances with the elapsed real time while playing', () => {
    const { result } = renderHook(() => useReplayClock(60));
    act(() => result.current.play());
    flushFrame(1000); // first frame only sets the baseline
    expect(result.current.time).toBe(0);
    flushFrame(1500);
    expect(result.current.time).toBeCloseTo(0.5);
    flushFrame(2500);
    expect(result.current.time).toBeCloseTo(1.5);
  });

  it('scales the elapsed time by the playback speed', () => {
    const { result } = renderHook(() => useReplayClock(60, { initialSpeed: 2 }));
    act(() => result.current.play());
    flushFrame(0);
    flushFrame(1000);
    expect(result.current.time).toBeCloseTo(2);
    act(() => result.current.setSpeed(4));
    flushFrame(0);
    flushFrame(500);
    expect(result.current.time).toBeCloseTo(4);
  });

  it('stops advancing when paused', () => {
    const { result } = renderHook(() => useReplayClock(60));
    act(() => result.current.play());
    flushFrame(0);
    flushFrame(1000);
    act(() => result.current.pause());
    expect(callbacks.size).toBe(0);
    expect(result.current.playing).toBe(false);
    expect(result.current.time).toBeCloseTo(1);
  });

  it('stops at the end of the round', () => {
    const { result } = renderHook(() => useReplayClock(2));
    act(() => result.current.play());
    flushFrame(0);
    flushFrame(5000);
    expect(result.current.time).toBe(2);
    expect(result.current.playing).toBe(false);
    expect(callbacks.size).toBe(0);
  });

  it('restarts from the beginning when played again at the end', () => {
    const { result } = renderHook(() => useReplayClock(2));
    act(() => result.current.seek(2));
    act(() => result.current.play());
    expect(result.current.time).toBe(0);
    expect(result.current.playing).toBe(true);
  });

  it('clamps seeks to the round bounds', () => {
    const { result } = renderHook(() => useReplayClock(10));
    act(() => result.current.seek(-5));
    expect(result.current.time).toBe(0);
    act(() => result.current.seek(99));
    expect(result.current.time).toBe(10);
    act(() => result.current.seek(4.5));
    expect(result.current.time).toBe(4.5);
  });

  it('toggles between playing and paused', () => {
    const { result } = renderHook(() => useReplayClock(10));
    act(() => result.current.toggle());
    expect(result.current.playing).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.playing).toBe(false);
  });

  it('can start automatically', () => {
    const { result } = renderHook(() => useReplayClock(10, { autoPlay: true }));
    expect(result.current.playing).toBe(true);
    expect(callbacks.size).toBe(1);
  });

  it('cancels the pending frame on unmount', () => {
    const { unmount } = renderHook(() => useReplayClock(10, { autoPlay: true }));
    expect(callbacks.size).toBe(1);
    unmount();
    expect(callbacks.size).toBe(0);
  });
});
