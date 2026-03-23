import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeService(overrides: Partial<AuthService> = {}): AuthService {
  return {
    login: jest.fn(),
    logout: jest.fn(),
    getMe: jest.fn(),
    ...overrides,
  } as unknown as AuthService;
}

function makeRes() {
  return { cookie: jest.fn(), clearCookie: jest.fn() } as any;
}

function makeReq(cookies: Record<string, string> = {}) {
  return { cookies } as any;
}

const SESSION_USER = { id: 'u1', email: 'alice@example.com', role: 'ADMIN' as const };

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------

describe('AuthController — login', () => {
  it('delegates to authService.login with the DTO and response', async () => {
    const expected = { id: 's1', userId: 'u1', expiresAt: '2025-01-01T00:00:00.000Z' };
    const service = makeService({ login: jest.fn().mockResolvedValue(expected) });
    const controller = new AuthController(service);
    const res = makeRes();
    const dto = { email: 'alice@example.com', password: 'SuperSecret123!' };

    const result = await controller.login(dto, res);

    expect(service.login).toHaveBeenCalledWith(dto, res);
    expect(result).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------

describe('AuthController — logout', () => {
  it('delegates to authService.logout with rawToken, res, and actor id', async () => {
    const service = makeService({ logout: jest.fn().mockResolvedValue(undefined) });
    const controller = new AuthController(service);
    const req = makeReq({ sid: 'raw-token-value' });
    const res = makeRes();

    await controller.logout(req, res, SESSION_USER);

    expect(service.logout).toHaveBeenCalledWith('raw-token-value', res, 'u1');
  });

  it('throws UnauthorizedException when the sid cookie is missing', async () => {
    const service = makeService();
    const controller = new AuthController(service);
    const req = makeReq({}); // no sid cookie
    const res = makeRes();

    await expect(controller.logout(req, res, SESSION_USER)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(service.logout).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getMe
// ---------------------------------------------------------------------------

describe('AuthController — getMe', () => {
  it('delegates to authService.getMe with the session user', async () => {
    const userDTO = {
      id: 'u1',
      email: 'alice@example.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      profile: { firstName: 'Alice', lastName: 'Smith', bio: null },
    };
    const service = makeService({ getMe: jest.fn().mockResolvedValue(userDTO) });
    const controller = new AuthController(service);

    const result = await controller.getMe(SESSION_USER);

    expect(service.getMe).toHaveBeenCalledWith(SESSION_USER);
    expect(result).toEqual(userDTO);
  });
});
