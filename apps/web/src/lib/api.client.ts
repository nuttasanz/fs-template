import type { BaseResponse, ErrorResponse } from '@repo/schemas';

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ErrorResponse,
  ) {
    super(body.message);
    this.name = 'ApiClientError';
  }
}

/**
 * Client-side fetch utility for use inside TanStack Query hooks.
 * Calls the Next.js /api proxy — do NOT use server-only `apiFetch` here.
 */
export async function apiFetchClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<BaseResponse<T>> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };

  const response = await fetch(path, { ...options, headers });

  if (!response.ok) {
    const errorBody: ErrorResponse = await response.json().catch(() => ({
      success: false as const,
      message: `HTTP ${response.status}`,
      code: 'INTERNAL_ERROR',
    }));
    throw new ApiClientError(response.status, errorBody);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return { success: true, message: '' } as BaseResponse<T>;
  }

  return response.json() as Promise<BaseResponse<T>>;
}
