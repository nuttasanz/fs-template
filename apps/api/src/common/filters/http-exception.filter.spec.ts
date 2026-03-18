import { HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { ZodError, z } from 'zod';
import { HttpExceptionFilter } from './http-exception.filter';
import { AppError } from '../exceptions/app-error';
import { ErrorCode } from '@repo/schemas';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHost(path = '/test') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ url: path }),
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  // ── AppError (4xx) ─────────────────────────────────────────────────────
  it('maps a 4xx AppError to the correct status and ErrorCode', () => {
    const { host, status, json } = makeHost();
    filter.catch(AppError.notFound('User not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: ErrorCode.NOT_FOUND,
        message: 'User not found',
      }),
    );
  });

  it('includes per-field errors for AppError(400) with errors array', () => {
    const { host, json } = makeHost();
    const err = AppError.badRequest('Validation failed', [
      { field: 'email', message: 'Invalid email' },
    ]);
    filter.catch(err, host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.VALIDATION_FAILED,
        errors: [{ field: 'email', message: 'Invalid email' }],
      }),
    );
  });

  // ── AppError (5xx) in production ───────────────────────────────────────
  it('masks 5xx AppError with a generic message in production', () => {
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';

    const { host, status, json } = makeHost();
    filter.catch(AppError.internal('DB connection failed'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error', code: ErrorCode.INTERNAL_ERROR }),
    );
    // Internal details must NOT leak
    expect(json.mock.calls[0][0].message).not.toContain('DB connection');

    process.env['NODE_ENV'] = originalEnv;
  });

  // ── ZodError ───────────────────────────────────────────────────────────
  it('maps a ZodError to 400 with field-level errors', () => {
    const { host, status, json } = makeHost();
    const schema = z.object({ email: z.string().email() });
    let zodErr!: ZodError;
    try {
      schema.parse({ email: 'bad' });
    } catch (e) {
      zodErr = e as ZodError;
    }

    filter.catch(zodErr, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.VALIDATION_FAILED,
        errors: expect.arrayContaining([expect.objectContaining({ field: 'email' })]),
      }),
    );
  });

  // ── NestJS HttpException ───────────────────────────────────────────────
  it('maps an HttpException to the correct status and code', () => {
    const { host, status, json } = makeHost();
    filter.catch(new HttpException('Forbidden', HttpStatus.FORBIDDEN), host);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: ErrorCode.FORBIDDEN }),
    );
  });

  // ── pg DatabaseError (SQLSTATE 5-digit code) ───────────────────────────
  it('maps a pg DatabaseError to 500 without leaking details in production', () => {
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';

    const { host, status, json } = makeHost();
    const pgErr = Object.assign(new Error('duplicate key value'), { code: '23505' });
    filter.catch(pgErr, host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error', code: ErrorCode.INTERNAL_ERROR }),
    );

    process.env['NODE_ENV'] = originalEnv;
  });

  // ── Unexpected error ───────────────────────────────────────────────────
  it('maps an unhandled error to 500', () => {
    const { host, status } = makeHost();
    filter.catch(new Error('Completely unexpected'), host);

    expect(status).toHaveBeenCalledWith(500);
  });

  // ── timestamp and path fields ─────────────────────────────────────────
  it('includes timestamp and path in every error response', () => {
    const { host, json } = makeHost('/api/users');
    filter.catch(AppError.notFound('Not found'), host);

    const body = json.mock.calls[0][0] as Record<string, unknown>;
    expect(body['path']).toBe('/api/users');
    expect(typeof body['timestamp']).toBe('string');
    expect(() => new Date(body['timestamp'] as string)).not.toThrow();
  });
});
