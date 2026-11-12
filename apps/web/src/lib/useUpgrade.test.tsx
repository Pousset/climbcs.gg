import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './api';
import { AuthProvider } from './auth';
import { useUpgrade } from './useUpgrade';
import { createFakeClient, createMemoryTokenStore } from '../test/helpers';
import type { FakeClient } from '../test/helpers';

const wrapper = (client: FakeClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthProvider client={client} tokenStore={createMemoryTokenStore('tok')}>
        <MemoryRouter>{children}</MemoryRouter>
      </AuthProvider>
    );
  };

describe('useUpgrade', () => {
  it('switches the plan, refreshes the user and reports success', async () => {
    const client = createFakeClient();
    const { result } = renderHook(() => useUpgrade(), { wrapper: wrapper(client) });
    let ok = false;
    await act(async () => {
      ok = await result.current.upgrade();
    });
    expect(ok).toBe(true);
    expect(client.setPlan).toHaveBeenCalledWith('premium');
    expect(client.me).toHaveBeenCalledTimes(2); // session restore + refresh
    expect(result.current.error).toBeNull();
    expect(result.current.pending).toBe(false);
  });

  it('explains that Premium is not available yet when the API answers 404', async () => {
    const client = createFakeClient({
      setPlan: vi.fn(async () => Promise.reject(new ApiError(404, null, 'nf'))),
    });
    const { result } = renderHook(() => useUpgrade(), { wrapper: wrapper(client) });
    let ok = true;
    await act(async () => {
      ok = await result.current.upgrade();
    });
    expect(ok).toBe(false);
    expect(result.current.error).toMatch(/bientôt disponible/);
  });

  it('reports a generic failure for other errors', async () => {
    const client = createFakeClient({
      setPlan: vi.fn(async () => Promise.reject(new ApiError(500, null, 'x'))),
    });
    const { result } = renderHook(() => useUpgrade(), { wrapper: wrapper(client) });
    await act(async () => {
      await result.current.upgrade();
    });
    expect(result.current.error).toMatch(/Impossible de passer en Premium/);
  });
});
