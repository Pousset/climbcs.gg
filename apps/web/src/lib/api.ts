import type { GatedReport, Plan, QuotaStatus, ReplayData } from '@cs2/core';
import type { AuthResult, PublicDemo, PublicUser, ScoreboardRow } from './types';

/** Error raised for any failed request. `code` is the machine-readable API code, if any. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | null,
    message: string,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl?: string;
  getToken: () => string | null;
  fetchImpl?: typeof fetch;
}

interface RequestOptions {
  json?: unknown;
  form?: FormData;
  query?: Record<string, string>;
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const { message } = body as { message: unknown };
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return fallback;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getToken: () => string | null;
  private readonly fetchImpl: typeof fetch;
  private onUnauthorized: () => void = () => undefined;

  constructor(options: ApiClientOptions) {
    this.baseUrl = (options.baseUrl ?? '/api').replace(/\/$/, '');
    this.getToken = options.getToken;
    this.fetchImpl = options.fetchImpl ?? ((...args) => fetch(...args));
  }

  /** Called when an authenticated request is rejected with 401 (expired or revoked token). */
  setUnauthorizedHandler(handler: () => void): void {
    this.onUnauthorized = handler;
  }

  private async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`, 'http://placeholder');
    for (const [key, value] of Object.entries(options.query ?? {}))
      url.searchParams.set(key, value);
    const target = `${url.pathname}${url.search}`;

    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    let body: BodyInit | undefined;
    if (options.form) {
      body = options.form; // the browser sets the multipart boundary itself
    } else if (options.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.json);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(target, { method, headers, body });
    } catch {
      throw new ApiError(0, 'NETWORK', 'Impossible de joindre le serveur');
    }

    if (response.status === 204) return undefined as T;
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload: unknown = isJson ? await response.json().catch(() => null) : null;

    if (!response.ok) {
      if (response.status === 401 && token) this.onUnauthorized();
      const code =
        payload && typeof payload === 'object' && 'code' in payload
          ? String((payload as { code: unknown }).code)
          : null;
      throw new ApiError(
        response.status,
        code,
        extractMessage(payload, response.statusText),
        payload,
      );
    }
    return payload as T;
  }

  register(username: string, password: string): Promise<AuthResult> {
    return this.request('POST', '/auth/register', { json: { username, password } });
  }

  login(username: string, password: string): Promise<AuthResult> {
    return this.request('POST', '/auth/login', { json: { username, password } });
  }

  me(): Promise<PublicUser> {
    return this.request('GET', '/users/me');
  }

  /** Simulated subscription (only available when the API enables the dev plan switch). */
  setPlan(plan: Plan): Promise<PublicUser> {
    return this.request('PUT', '/users/me/plan', { json: { plan } });
  }

  quota(): Promise<QuotaStatus> {
    return this.request('GET', '/demos/quota');
  }

  listDemos(): Promise<PublicDemo[]> {
    return this.request('GET', '/demos');
  }

  getDemo(id: string): Promise<PublicDemo> {
    return this.request('GET', `/demos/${id}`);
  }

  uploadDemo(file: File): Promise<PublicDemo> {
    const form = new FormData();
    form.append('file', file);
    return this.request('POST', '/demos', { form });
  }

  getReplay(id: string): Promise<ReplayData> {
    return this.request('GET', `/demos/${id}/replay`);
  }

  getScoreboard(id: string): Promise<ScoreboardRow[]> {
    return this.request('GET', `/demos/${id}/scoreboard`);
  }

  getReport(id: string, playerId: string): Promise<GatedReport> {
    return this.request('GET', `/demos/${id}/report`, { query: { player: playerId } });
  }

  deleteDemo(id: string): Promise<void> {
    return this.request('DELETE', `/demos/${id}`);
  }
}
