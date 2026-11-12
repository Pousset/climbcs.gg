import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import type { ApiClient } from '../lib/api';
import { AuthProvider } from '../lib/auth';
import { createTokenStore } from '../lib/token-store';
import type { PublicUser } from '../lib/types';

export const alice: PublicUser = {
  id: 'u1',
  username: 'Alice',
  plan: 'free',
  createdAt: '2026-01-01T00:00:00.000Z',
};

export type FakeClient = ApiClient & { [K in keyof ApiClient]: ReturnType<typeof vi.fn> };

/** ApiClient test double: every method is a vi.fn() that resolves to sensible defaults. */
export function createFakeClient(
  overrides: Partial<Record<keyof ApiClient, unknown>> = {},
): FakeClient {
  return {
    setUnauthorizedHandler: vi.fn(),
    register: vi.fn(async () => ({ accessToken: 'tok', user: alice })),
    login: vi.fn(async () => ({ accessToken: 'tok', user: alice })),
    me: vi.fn(async () => alice),
    setPlan: vi.fn(async () => ({ ...alice, plan: 'premium' })),
    quota: vi.fn(async () => ({
      plan: 'free',
      limit: 1,
      used: 0,
      remaining: 1,
      allowed: true,
      resetsAt: '2099-01-01T00:00:00.000Z',
    })),
    listDemos: vi.fn(async () => []),
    getDemo: vi.fn(),
    uploadDemo: vi.fn(),
    getReplay: vi.fn(),
    getScoreboard: vi.fn(),
    getReport: vi.fn(),
    deleteDemo: vi.fn(async () => undefined),
    ...overrides,
  } as unknown as FakeClient;
}

export function createMemoryTokenStore(initial?: string) {
  const data = new Map<string, string>();
  const store = createTokenStore({
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  });
  if (initial) store.set(initial);
  return store;
}

interface RenderOptions {
  client?: FakeClient;
  /** Pass a token to start with an authenticated session. */
  token?: string;
  route?: string;
}

export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  const client = options.client ?? createFakeClient();
  const tokenStore = createMemoryTokenStore(options.token);
  const view = render(
    <AuthProvider client={client} tokenStore={tokenStore}>
      <MemoryRouter initialEntries={[options.route ?? '/']}>{ui}</MemoryRouter>
    </AuthProvider>,
  );
  return { ...view, client, tokenStore };
}
