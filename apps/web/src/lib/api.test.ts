import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from './api';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function setup(response: Response | (() => Response), token: string | null = null) {
  const fetchImpl = vi.fn(async () => (typeof response === 'function' ? response() : response));
  const client = new ApiClient({
    getToken: () => token,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  const lastCall = () => fetchImpl.mock.calls.at(-1) as unknown as [string, RequestInit];
  return { client, fetchImpl, lastCall };
}

describe('ApiClient requests', () => {
  it('posts JSON credentials without an Authorization header when logged out', async () => {
    const { client, lastCall } = setup(json({ accessToken: 't', user: { id: '1' } }, 201));
    const result = await client.login('mathis', 'secret-pw');
    const [url, init] = lastCall();
    expect(url).toBe('/api/auth/login');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ username: 'mathis', password: 'secret-pw' });
    expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined();
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(result.accessToken).toBe('t');
  });

  it('adds the bearer token when one is stored', async () => {
    const { client, lastCall } = setup(json({ id: 'u1' }), 'my-token');
    await client.me();
    expect((lastCall()[1].headers as Record<string, string>)['Authorization']).toBe(
      'Bearer my-token',
    );
  });

  it('honours a custom base URL', async () => {
    const fetchImpl = vi.fn(async () => json([]));
    const client = new ApiClient({
      baseUrl: 'https://api.example.com/v1/',
      getToken: () => null,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.listDemos();
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toBe('/v1/demos');
  });

  it('encodes query parameters for the report endpoint', async () => {
    const { client, lastCall } = setup(json({}));
    await client.getReport('d-1', 'player 1&x');
    expect(lastCall()[0]).toBe('/api/demos/d-1/report?player=player+1%26x');
  });

  it('uploads a file as multipart form data without forcing a content type', async () => {
    const { client, lastCall } = setup(json({ id: 'd1' }, 202));
    const file = new File(['PBDEMS2'], 'match.dem');
    await client.uploadDemo(file);
    const [url, init] = lastCall();
    expect(url).toBe('/api/demos');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('file')).toBe(file);
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('returns undefined for 204 responses', async () => {
    const { client, lastCall } = setup(new Response(null, { status: 204 }));
    await expect(client.deleteDemo('d1')).resolves.toBeUndefined();
    expect(lastCall()[1].method).toBe('DELETE');
  });

  it('sends the plan switch as JSON', async () => {
    const { client, lastCall } = setup(json({ plan: 'premium' }));
    await client.setPlan('premium');
    expect(lastCall()[0]).toBe('/api/users/me/plan');
    expect(JSON.parse(lastCall()[1].body as string)).toEqual({ plan: 'premium' });
  });
});

describe('ApiClient errors', () => {
  it('maps an API error to ApiError with status, code and message', async () => {
    const { client } = setup(
      json({ code: 'DAILY_QUOTA_EXCEEDED', message: 'Daily free demo already used' }, 403),
    );
    const error = await client.quota().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 403,
      code: 'DAILY_QUOTA_EXCEEDED',
      message: 'Daily free demo already used',
    });
  });

  it('joins array messages and keeps the raw body', async () => {
    const { client } = setup(json({ message: ['a', 'b'], issues: [1] }, 400));
    const error = (await client.me().catch((e: unknown) => e)) as ApiError;
    expect(error.message).toBe('a, b');
    expect(error.body).toEqual({ message: ['a', 'b'], issues: [1] });
  });

  it('falls back to the status text for non-JSON errors', async () => {
    const { client } = setup(new Response('oops', { status: 502, statusText: 'Bad Gateway' }));
    const error = (await client.me().catch((e: unknown) => e)) as ApiError;
    expect(error).toMatchObject({ status: 502, code: null, message: 'Bad Gateway' });
  });

  it('reports network failures with status 0', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('failed to fetch');
    });
    const client = new ApiClient({
      getToken: () => null,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(client.me()).rejects.toMatchObject({ status: 0, code: 'NETWORK' });
  });

  it('notifies the unauthorized handler only when a token was sent', async () => {
    const handler = vi.fn();
    const withToken = setup(json({ message: 'expired' }, 401), 'stale');
    withToken.client.setUnauthorizedHandler(handler);
    await withToken.client.me().catch(() => undefined);
    expect(handler).toHaveBeenCalledTimes(1);

    const withoutToken = setup(json({ message: 'Invalid credentials' }, 401));
    withoutToken.client.setUnauthorizedHandler(handler);
    await withoutToken.client.login('a', 'b').catch(() => undefined);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
