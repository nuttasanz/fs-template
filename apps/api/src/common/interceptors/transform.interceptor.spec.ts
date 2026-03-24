import { StreamableFile } from '@nestjs/common';
import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';
import { PaginatedResponse } from '../responses/paginated.response';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReflector(message?: string) {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(message ?? undefined),
  };
}

function makeContext() {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
  };
}

function makeCallHandler<T>(data: T) {
  return { handle: () => of(data) };
}

// ---------------------------------------------------------------------------
// TransformInterceptor
// ---------------------------------------------------------------------------

describe('TransformInterceptor', () => {
  it('wraps plain data in { success: true, message: "OK", data }', async () => {
    const reflector = makeReflector();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptor = new TransformInterceptor(reflector as any);
    const ctx = makeContext();
    const handler = makeCallHandler({ id: '1', name: 'Test' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await lastValueFrom(interceptor.intercept(ctx as any, handler));

    expect(result).toEqual({
      success: true,
      message: 'OK',
      data: { id: '1', name: 'Test' },
    });
  });

  it('uses custom @ResponseMessage decorator message', async () => {
    const reflector = makeReflector('User created successfully');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptor = new TransformInterceptor(reflector as any);
    const ctx = makeContext();
    const handler = makeCallHandler({ id: '1' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await lastValueFrom(interceptor.intercept(ctx as any, handler));

    expect(result).toEqual(
      expect.objectContaining({ success: true, message: 'User created successfully' }),
    );
  });

  it('handles PaginatedResponse with meta', async () => {
    const reflector = makeReflector();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptor = new TransformInterceptor(reflector as any);
    const ctx = makeContext();
    const paginated = new PaginatedResponse([{ id: '1' }], {
      totalItems: 1,
      totalPages: 1,
      currentPage: 1,
      pageSize: 20,
    });
    const handler = makeCallHandler(paginated);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await lastValueFrom(interceptor.intercept(ctx as any, handler));

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        data: [{ id: '1' }],
        meta: { totalItems: 1, totalPages: 1, currentPage: 1, pageSize: 20 },
      }),
    );
  });

  it('passes through null/undefined (204 No Content)', async () => {
    const reflector = makeReflector();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptor = new TransformInterceptor(reflector as any);
    const ctx = makeContext();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nullResult = await lastValueFrom(
      interceptor.intercept(ctx as any, makeCallHandler(null)),
    );
    expect(nullResult).toBeNull();

    const undefinedResult = await lastValueFrom(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      interceptor.intercept(ctx as any, makeCallHandler(undefined)),
    );
    expect(undefinedResult).toBeUndefined();
  });

  it('passes through StreamableFile untouched', async () => {
    const reflector = makeReflector();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptor = new TransformInterceptor(reflector as any);
    const ctx = makeContext();
    const file = new StreamableFile(Buffer.from('hello'));
    const handler = makeCallHandler(file);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await lastValueFrom(interceptor.intercept(ctx as any, handler));

    expect(result).toBe(file);
  });

  it('passes through already-formatted response (has `success` key)', async () => {
    const reflector = makeReflector();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptor = new TransformInterceptor(reflector as any);
    const ctx = makeContext();
    const formatted = { success: true, message: 'Already done', data: { id: '1' } };
    const handler = makeCallHandler(formatted);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await lastValueFrom(interceptor.intercept(ctx as any, handler));

    expect(result).toBe(formatted);
  });

  it('passes through Terminus health-check response (has `status` + `details`)', async () => {
    const reflector = makeReflector();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptor = new TransformInterceptor(reflector as any);
    const ctx = makeContext();
    const healthCheck = { status: 'ok', details: { database: { status: 'up' } } };
    const handler = makeCallHandler(healthCheck);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await lastValueFrom(interceptor.intercept(ctx as any, handler));

    expect(result).toBe(healthCheck);
  });
});
