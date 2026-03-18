import type { BaseResponse, ErrorField, ErrorResponse } from '@repo/schemas';
import { env } from '@/env';

const API_BASE = `${env.NEXT_PUBLIC_API_URL}/api/v1`;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly errors?: ErrorField[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const REQUEST_TIMEOUT_MS = 10_000;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...init.headers,
      },
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const isJson = res.headers.get('content-type')?.includes('application/json') ?? false;
    const body = isJson ? ((await res.json().catch(() => ({}))) as Partial<ErrorResponse>) : {};
    throw new ApiError(
      res.status,
      body.message ?? res.statusText ?? 'Request failed',
      body.code,
      body.errors,
    );
  }

  if (res.status === 204) return undefined as T;

  const body = (await res.json()) as BaseResponse<T>;
  return body.data as T;
}

export const apiGet = <T>(path: string): Promise<T> => request<T>(`${API_BASE}${path}`);

export const apiPost = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(`${API_BASE}${path}`, { method: 'POST', body: JSON.stringify(body) });

export const apiPatch = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(`${API_BASE}${path}`, { method: 'PATCH', body: JSON.stringify(body) });

export const apiDelete = (path: string): Promise<void> =>
  request<void>(`${API_BASE}${path}`, { method: 'DELETE' });
