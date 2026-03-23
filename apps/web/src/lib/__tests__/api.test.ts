import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before the module under test is imported
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}));

vi.mock('@/env.server', () => ({
  serverEnv: { INTERNAL_API_URL: 'http://localhost:4000' },
}));

vi.mock('@/lib/logger', () => ({
  captureError: vi.fn(),
}));

// Import AFTER mocks are registered
import { apiFetch, paginatedApiFetch, ApiError } from '../api';
import { captureError } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function noContentResponse() {
  return new Response(null, { status: 204, headers: { 'Content-Length': '0' } });
}

function errorResponse(
  status: number,
  message = 'Error',
  code = 'INTERNAL_ERROR',
) {
  return jsonResponse({ success: false, message, code }, status);
}

// ---------------------------------------------------------------------------
// apiFetch
// ---------------------------------------------------------------------------

describe('apiFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed JSON on 200', async () => {
    const body = { success: true, message: 'OK', data: { id: '1' } };
    vi.mocked(fetch).mockResolvedValue(jsonResponse(body));

    const result = await apiFetch('/api/v1/users/1');

    expect(result).toEqual(body);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/users/1',
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/json' }) }),
    );
  });

  it('handles 204 No Content (empty response)', async () => {
    vi.mocked(fetch).mockResolvedValue(noContentResponse());

    const result = await apiFetch('/api/v1/users/1', { method: 'DELETE' });

    expect(result).toEqual({ success: true });
  });

  it('throws ApiError on 4xx responses', async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(404, 'Not found', 'NOT_FOUND'),
    );

    try {
      await apiFetch('/api/v1/users/999');
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(404);
      expect((e as ApiError).body.message).toBe('Not found');
    }
  });

  it('throws ApiError on 5xx and logs via captureError', async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(500, 'Internal Server Error', 'INTERNAL_ERROR'),
    );

    await expect(
      apiFetch('/api/v1/users', { method: 'POST', body: '{}' }),
    ).rejects.toThrow(ApiError);

    expect(captureError).toHaveBeenCalled();
  });

  it('retries GET requests on 5xx (up to 2 retries)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(errorResponse(503, 'Unavailable'))
      .mockResolvedValueOnce(errorResponse(503, 'Unavailable'))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'OK', data: [] }));

    const result = await apiFetch('/api/v1/users');

    expect(result).toEqual({ success: true, message: 'OK', data: [] });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry POST/PATCH/DELETE on 5xx', async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(500, 'Server Error'),
    );

    await expect(
      apiFetch('/api/v1/users', { method: 'POST', body: '{}' }),
    ).rejects.toThrow(ApiError);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('passes cookie header when provided', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: true, message: 'OK', data: {} }),
    );

    await apiFetch('/api/v1/auth/me', {}, 'sid=abc123');

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Cookie: 'sid=abc123' }),
      }),
    );
  });

  it('handles JSON parse failure on error response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('not json', { status: 400, headers: { 'Content-Type': 'text/plain' } }),
    );

    await expect(apiFetch('/api/v1/users', { method: 'POST', body: '{}' })).rejects.toThrow(
      ApiError,
    );
  });
});

// ---------------------------------------------------------------------------
// paginatedApiFetch
// ---------------------------------------------------------------------------

describe('paginatedApiFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns paginated response', async () => {
    const body = {
      success: true,
      message: 'OK',
      data: [{ id: '1' }],
      meta: { totalItems: 1, totalPages: 1, currentPage: 1, pageSize: 20 },
    };
    vi.mocked(fetch).mockResolvedValue(jsonResponse(body));

    const result = await paginatedApiFetch('/api/v1/users?page=1&limit=20');

    expect(result).toEqual(body);
    expect(result.meta).toEqual(
      expect.objectContaining({ totalItems: 1, currentPage: 1 }),
    );
  });

  it('throws ApiError on error response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(403, 'Forbidden', 'FORBIDDEN'),
    );

    await expect(paginatedApiFetch('/api/v1/users')).rejects.toThrow(ApiError);
  });
});
