import { describe, expect, it } from 'vitest';
import { createTokenStore } from './token-store';

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
};

const brokenStorage = {
  getItem: () => {
    throw new Error('denied');
  },
  setItem: () => {
    throw new Error('denied');
  },
  removeItem: () => {
    throw new Error('denied');
  },
};

describe('createTokenStore', () => {
  it('stores, reads and clears the token', () => {
    const storage = memoryStorage();
    const store = createTokenStore(storage);
    expect(store.get()).toBeNull();
    store.set('abc');
    expect(store.get()).toBe('abc');
    expect(storage.data.size).toBe(1);
    store.clear();
    expect(store.get()).toBeNull();
    expect(storage.data.size).toBe(0);
  });

  it('reads a token persisted by a previous session', () => {
    const storage = memoryStorage();
    createTokenStore(storage).set('persisted');
    expect(createTokenStore(storage).get()).toBe('persisted');
  });

  it('keeps working in memory when storage is unavailable', () => {
    const store = createTokenStore(brokenStorage);
    expect(store.get()).toBeNull();
    store.set('session-only');
    expect(store.get()).toBe('session-only');
    store.clear();
    expect(store.get()).toBeNull();
  });
});
