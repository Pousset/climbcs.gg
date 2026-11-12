const KEY = 'cs2.accessToken';

export interface TokenStore {
  get(): string | null;
  set(token: string): void;
  clear(): void;
}

/**
 * Persists the access token. Every storage access is guarded because browsers throw when
 * storage is disabled (private mode, blocked cookies); the app then works for the session only.
 */
export function createTokenStore(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
): TokenStore {
  let memory: string | null = null;
  return {
    get() {
      try {
        return storage.getItem(KEY) ?? memory;
      } catch {
        return memory;
      }
    },
    set(token) {
      memory = token;
      try {
        storage.setItem(KEY, token);
      } catch {
        /* keep the in-memory copy */
      }
    },
    clear() {
      memory = null;
      try {
        storage.removeItem(KEY);
      } catch {
        /* nothing to clean */
      }
    },
  };
}
