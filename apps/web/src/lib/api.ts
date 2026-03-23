import 'server-only';
import type { BaseResponse, ErrorResponse, PaginatedBaseResponse } from '@repo/schemas';
import { serverEnv } from '@/env.server';
import { captureError } from '@/lib/logger';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ErrorResponse,
  ) {
    super(body.message);
    this.name = 'ApiError';
  }
}

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 200;

function isRetryable(method: string, status: number): boolean {
  return method === 'GET' && status >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, init: RequestInit, label: string): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);

      if (response.ok || !isRetryable(method, response.status) || attempt === MAX_RETRIES) {
        return response;
      }

      captureError({ status: response.status }, `${label} retry ${attempt + 1}/${MAX_RETRIES}`);
    } catch (error) {
      if (method !== 'GET' || attempt === MAX_RETRIES) throw error;
      captureError(error, `${label} network retry ${attempt + 1}/${MAX_RETRIES}`);
    }

    await delay(BASE_DELAY_MS * 2 ** attempt);
  }

  // Unreachable — loop always returns or throws on last attempt
  throw new Error(`fetchWithRetry: exhausted retries for ${label}`);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  cookieHeader?: string,
): Promise<BaseResponse<T>> {
  const url = `${serverEnv.INTERNAL_API_URL}${path}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    ...(options.headers ?? {}),
  };

  const response = await fetchWithRetry(
    url,
    { ...options, headers, cache: 'no-store' },
    `apiFetch ${path}`,
  );

  if (!response.ok) {
    const errorBody: ErrorResponse = await response.json().catch(() => ({
      success: false as const,
      message: `HTTP ${response.status}`,
      code: 'INTERNAL_ERROR',
    }));
    if (response.status >= 500) {
      captureError(errorBody, `apiFetch ${path}`);
    }
    throw new ApiError(response.status, errorBody);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return { success: true } as BaseResponse<T>;
  }

  return response.json() as Promise<BaseResponse<T>>;
}

export async function paginatedApiFetch<T>(
  path: string,
  options: RequestInit = {},
  cookieHeader?: string,
): Promise<PaginatedBaseResponse<T[]>> {
  const url = `${serverEnv.INTERNAL_API_URL}${path}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    ...(options.headers ?? {}),
  };

  const response = await fetchWithRetry(
    url,
    { ...options, headers, cache: 'no-store' },
    `paginatedApiFetch ${path}`,
  );

  if (!response.ok) {
    const errorBody: ErrorResponse = await response.json().catch(() => ({
      success: false as const,
      message: `HTTP ${response.status}`,
      code: 'INTERNAL_ERROR',
    }));
    if (response.status >= 500) {
      captureError(errorBody, `paginatedApiFetch ${path}`);
    }
    throw new ApiError(response.status, errorBody);
  }

  return response.json() as Promise<PaginatedBaseResponse<T[]>>;
}
