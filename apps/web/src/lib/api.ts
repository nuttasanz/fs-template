import type { BaseResponse, ErrorField, ErrorResponse } from '@repo/schemas';

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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Partial<ErrorResponse>;
    throw new ApiError(res.status, body.message ?? 'Request failed', body.code, body.errors);
  }

  if (res.status === 204) return undefined as T;

  const body = (await res.json()) as BaseResponse<T>;
  return body.data as T;
}

export const apiGet = <T>(path: string): Promise<T> => request<T>(path);

export const apiPost = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const apiPatch = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

export const apiDelete = (path: string): Promise<void> =>
  request<void>(path, { method: 'DELETE' });
