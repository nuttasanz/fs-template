import 'server-only';
import type { BaseResponse, ErrorResponse, PaginatedBaseResponse } from '@repo/schemas';
import { serverEnv } from '@/env.server';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ErrorResponse,
  ) {
    super(body.message);
    this.name = 'ApiError';
  }
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

  const response = await fetch(url, { ...options, headers, cache: 'no-store' });

  if (!response.ok) {
    const errorBody: ErrorResponse = await response.json().catch(() => ({
      success: false as const,
      message: `HTTP ${response.status}`,
      code: 'INTERNAL_ERROR',
    }));
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

  const response = await fetch(url, { ...options, headers, cache: 'no-store' });

  if (!response.ok) {
    const errorBody: ErrorResponse = await response.json().catch(() => ({
      success: false as const,
      message: `HTTP ${response.status}`,
      code: 'INTERNAL_ERROR',
    }));
    throw new ApiError(response.status, errorBody);
  }

  return response.json() as Promise<PaginatedBaseResponse<T[]>>;
}
