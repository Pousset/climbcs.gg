import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { ApiClient } from './api';
import type { TokenStore } from './token-store';
import type { PublicUser } from './types';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  client: ApiClient;
  login(username: string, password: string): Promise<void>;
  register(username: string, password: string): Promise<void>;
  logout(): void;
  /** Reloads the user (e.g. after a plan change). */
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  client: ApiClient;
  tokenStore: TokenStore;
  children: ReactNode;
}

export function AuthProvider({ client, tokenStore, children }: AuthProviderProps) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() =>
    tokenStore.get() ? 'loading' : 'anonymous',
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('anonymous');
  }, [tokenStore]);

  useEffect(() => {
    client.setUnauthorizedHandler(logout);
  }, [client, logout]);

  useEffect(() => {
    if (!tokenStore.get()) return;
    let cancelled = false;
    client
      .me()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!cancelled) logout();
      });
    return () => {
      cancelled = true;
    };
  }, [client, tokenStore, logout]);

  const startSession = useCallback(
    (result: { accessToken: string; user: PublicUser }) => {
      tokenStore.set(result.accessToken);
      setUser(result.user);
      setStatus('authenticated');
    },
    [tokenStore],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      client,
      login: async (username, password) => startSession(await client.login(username, password)),
      register: async (username, password) =>
        startSession(await client.register(username, password)),
      logout,
      refresh: async () => setUser(await client.me()),
    }),
    [status, user, client, logout, startSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

/** Renders its children only for authenticated users; otherwise redirects to the login page. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <p role="status">Chargement…</p>;
  if (status === 'anonymous')
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
