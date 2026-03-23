import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AUDIT_LOG_EVENT, AuditLogEvent } from '../events/audit-log.event';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEventEmitter() {
  return { emit: jest.fn() };
}

function makeContext(
  method: string,
  path: string,
  body: Record<string, unknown> = {},
  params: Record<string, string> = {},
  sessionUser?: { id: string },
  ip?: string,
) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        path,
        body,
        params,
        sessionUser: sessionUser ?? null,
        ip: ip ?? '127.0.0.1',
      }),
    }),
  };
}

function makeCallHandler() {
  return { handle: () => of({ id: '1' }) };
}

// ---------------------------------------------------------------------------
// AuditLogInterceptor
// ---------------------------------------------------------------------------

describe('AuditLogInterceptor', () => {
  it('emits AUDIT_LOG_EVENT on POST with sanitized body', async () => {
    const emitter = makeEventEmitter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptor = new AuditLogInterceptor(emitter as any);
    const ctx = makeContext(
      'POST',
      '/api/v1/users',
      { email: 'a@b.com', password: 'secret123' },
      {},
      { id: 'actor1' },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await lastValueFrom(interceptor.intercept(ctx as any, makeCallHandler()));

    expect(emitter.emit).toHaveBeenCalledWith(
      AUDIT_LOG_EVENT,
      expect.objectContaining({
        actorId: 'actor1',
        action: 'CREATE',
        entityName: 'users',
        changes: { email: 'a@b.com', password: '[REDACTED]' },
      }),
    );
  });

  it('emits AUDIT_LOG_EVENT on PATCH with action=UPDATE', async () => {
    const emitter = makeEventEmitter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptor = new AuditLogInterceptor(emitter as any);
    const ctx = makeContext(
      'PATCH',
      '/api/v1/users/u1',
      { firstName: 'Updated' },
      { id: 'u1' },
      { id: 'actor1' },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await lastValueFrom(interceptor.intercept(ctx as any, makeCallHandler()));

    expect(emitter.emit).toHaveBeenCalledWith(
      AUDIT_LOG_EVENT,
      expect.objectContaining({
        action: 'UPDATE',
        targetId: 'u1',
        entityName: 'users',
        changes: { firstName: 'Updated' },
      }),
    );
  });

  it('emits AUDIT_LOG_EVENT on DELETE with changes=null', async () => {
    const emitter = makeEventEmitter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptor = new AuditLogInterceptor(emitter as any);
    const ctx = makeContext('DELETE', '/api/v1/users/u1', {}, { id: 'u1' }, { id: 'actor1' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await lastValueFrom(interceptor.intercept(ctx as any, makeCallHandler()));

    expect(emitter.emit).toHaveBeenCalledWith(
      AUDIT_LOG_EVENT,
      expect.objectContaining({
        action: 'DELETE',
        targetId: 'u1',
        changes: null,
      }),
    );
  });

  it('skips GET requests (no action mapped)', async () => {
    const emitter = makeEventEmitter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptor = new AuditLogInterceptor(emitter as any);
    const ctx = makeContext('GET', '/api/v1/users');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await lastValueFrom(interceptor.intercept(ctx as any, makeCallHandler()));

    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('skips auth/login and auth/logout paths', async () => {
    const emitter = makeEventEmitter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptor = new AuditLogInterceptor(emitter as any);

    const loginCtx = makeContext('POST', '/api/v1/auth/login', { email: 'a@b.com', password: 'pw' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await lastValueFrom(interceptor.intercept(loginCtx as any, makeCallHandler()));

    const logoutCtx = makeContext('POST', '/api/v1/auth/logout');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await lastValueFrom(interceptor.intercept(logoutCtx as any, makeCallHandler()));

    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('sanitizes sensitive fields (password, token, secret → [REDACTED])', async () => {
    const emitter = makeEventEmitter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptor = new AuditLogInterceptor(emitter as any);
    const ctx = makeContext(
      'POST',
      '/api/v1/settings',
      { password: 'pw', passwordHash: 'hash', token: 'tok', secret: 'sec', name: 'visible' },
      {},
      { id: 'actor1' },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await lastValueFrom(interceptor.intercept(ctx as any, makeCallHandler()));

    const emittedEvent = emitter.emit.mock.calls[0][1] as AuditLogEvent;
    expect(emittedEvent.changes).toEqual({
      password: '[REDACTED]',
      passwordHash: '[REDACTED]',
      token: '[REDACTED]',
      secret: '[REDACTED]',
      name: 'visible',
    });
  });

  it('extracts entity name from versioned path /api/v1/users/123 → users', async () => {
    const emitter = makeEventEmitter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptor = new AuditLogInterceptor(emitter as any);
    const ctx = makeContext('DELETE', '/api/v1/users/123', {}, { id: '123' }, { id: 'actor1' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await lastValueFrom(interceptor.intercept(ctx as any, makeCallHandler()));

    const emittedEvent = emitter.emit.mock.calls[0][1] as AuditLogEvent;
    expect(emittedEvent.entityName).toBe('users');
  });
});
