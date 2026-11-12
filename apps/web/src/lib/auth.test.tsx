import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from './api';
import { AuthProvider, RequireAuth, useAuth } from './auth';
import { createTokenStore } from './token-store';
import type { PublicUser } from './types';

const alice: PublicUser = {
  id: 'u1',
  username: 'Alice',
  plan: 'free',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function fakeClient(overrides: Partial<Record<'me' | 'login' | 'register', unknown>> = {}) {
  return {
    setUnauthorizedHandler: vi.fn(),
    me: vi.fn(async () => alice),
    login: vi.fn(async () => ({ accessToken: 'tok', user: alice })),
    register: vi.fn(async () => ({ accessToken: 'tok2', user: alice })),
    ...overrides,
  } as unknown as ApiClient &
    Record<'me' | 'login' | 'register' | 'setUnauthorizedHandler', ReturnType<typeof vi.fn>>;
}

const memoryStore = (initial?: string) => {
  const data = new Map<string, string>();
  const store = createTokenStore({
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  });
  if (initial) store.set(initial);
  return store;
};

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <p data-testid="status">{auth.status}</p>
      <p data-testid="user">{auth.user?.username ?? 'none'}</p>
      <button onClick={() => void auth.login('alice', 'pw')}>login</button>
      <button onClick={() => void auth.register('alice', 'pw')}>register</button>
      <button onClick={auth.logout}>logout</button>
    </div>
  );
}

const renderProbe = (client: ApiClient, store = memoryStore()) =>
  render(
    <AuthProvider client={client} tokenStore={store}>
      <Probe />
    </AuthProvider>,
  );

describe('AuthProvider', () => {
  it('starts anonymous without a stored token and does not call the API', () => {
    const client = fakeClient();
    renderProbe(client);
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
    expect(client.me).not.toHaveBeenCalled();
  });

  it('restores the session from a stored token', async () => {
    renderProbe(fakeClient(), memoryStore('stored'));
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('Alice');
  });

  it('drops an invalid stored token', async () => {
    const store = memoryStore('stale');
    renderProbe(fakeClient({ me: vi.fn(async () => Promise.reject(new Error('401'))) }), store);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    expect(store.get()).toBeNull();
  });

  it('logs in, stores the token and exposes the user', async () => {
    const store = memoryStore();
    const client = fakeClient();
    renderProbe(client, store);
    await act(async () => screen.getByText('login').click());
    expect(client.login).toHaveBeenCalledWith('alice', 'pw');
    expect(store.get()).toBe('tok');
    expect(screen.getByTestId('user')).toHaveTextContent('Alice');
  });

  it('registers a new account the same way', async () => {
    const store = memoryStore();
    renderProbe(fakeClient(), store);
    await act(async () => screen.getByText('register').click());
    expect(store.get()).toBe('tok2');
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  });

  it('keeps the visitor anonymous when login fails', async () => {
    const client = fakeClient({
      login: vi.fn(async () => Promise.reject(new Error('Invalid credentials'))),
    });
    const Failing = () => {
      const auth = useAuth();
      return <button onClick={() => void auth.login('a', 'b').catch(() => undefined)}>try</button>;
    };
    render(
      <AuthProvider client={client} tokenStore={memoryStore()}>
        <Failing />
        <Probe />
      </AuthProvider>,
    );
    await act(async () => screen.getByText('try').click());
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
  });

  it('logs out and clears the token', async () => {
    const store = memoryStore('stored');
    renderProbe(fakeClient(), store);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    await act(async () => screen.getByText('logout').click());
    expect(store.get()).toBeNull();
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('registers a handler so a 401 logs the user out', async () => {
    const client = fakeClient();
    renderProbe(client, memoryStore('stored'));
    await waitFor(() => expect(client.setUnauthorizedHandler).toHaveBeenCalled());
    const handler = client.setUnauthorizedHandler.mock.calls[0]![0] as () => void;
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    act(() => handler());
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
  });
});

describe('useAuth', () => {
  it('throws outside of the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow(/AuthProvider/);
    spy.mockRestore();
  });
});

describe('RequireAuth', () => {
  const renderRoutes = (client: ApiClient, store: ReturnType<typeof memoryStore>) =>
    render(
      <AuthProvider client={client} tokenStore={store}>
        <MemoryRouter initialEntries={['/prive']}>
          <Routes>
            <Route path="/connexion" element={<p>page connexion</p>} />
            <Route
              path="/prive"
              element={
                <RequireAuth>
                  <p>zone privée</p>
                </RequireAuth>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

  it('redirects anonymous visitors to the login page', () => {
    renderRoutes(fakeClient(), memoryStore());
    expect(screen.getByText('page connexion')).toBeInTheDocument();
  });

  it('shows the content to authenticated users', async () => {
    renderRoutes(fakeClient(), memoryStore('stored'));
    expect(await screen.findByText('zone privée')).toBeInTheDocument();
  });
});
