import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { SessionGuard } from './session.guard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(cookies: Record<string, string> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ cookies, sessionUser: undefined }),
    }),
  } as unknown as ExecutionContext;
}

function makeDb(row: Record<string, unknown> | null) {
  return {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(row ? [row] : []),
          }),
        }),
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SessionGuard', () => {
  it('throws UnauthorizedException when no sid cookie is present', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const guard = new SessionGuard({} as any);
    await expect(guard.canActivate(makeContext())).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when the session is not found (expired or invalid)', async () => {
    const db = makeDb(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const guard = new SessionGuard(db as any);
    await expect(guard.canActivate(makeContext({ sid: 'bad-token' }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('populates request.sessionUser and returns true for a valid session', async () => {
    const row = { userId: 'user-1', email: 'admin@example.com', role: 'ADMIN' };
    const db = makeDb(row);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const guard = new SessionGuard(db as any);

    const req: Record<string, unknown> = { cookies: { sid: 'valid-token' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(req['sessionUser']).toEqual({
      id: 'user-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });
  });
});
