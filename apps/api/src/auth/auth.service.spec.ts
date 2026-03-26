import * as bcrypt from 'bcrypt';
import {
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AUDIT_LOG_EVENT } from '../common/events/audit-log.event';

jest.mock('bcrypt');
const mockBcryptCompare = bcrypt.compare as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRes() {
  return { cookie: jest.fn(), clearCookie: jest.fn() };
}

const mockEventEmitter = { emit: jest.fn() };
const mockConfig = { NODE_ENV: 'test', SESSION_TTL_DAYS: 7 };

const USER_RECORD = {
  id: 'u1',
  email: 'alice@example.com',
  passwordHash: '$2b$12$hashed',
  role: 'USER' as const,
  status: 'ACTIVE' as const,
};

const SESSION_RECORD = {
  id: 's1',
  userId: 'u1',
  token: 'hashed-token',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};

function makeMockUsersService() {
  return { findOne: jest.fn() };
}

function makeMockSessionsRepo() {
  return {
    findValidSession: jest.fn(),
    createSession: jest.fn(),
    deleteByToken: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockEventEmitter.emit.mockClear();
});

describe('AuthService — login', () => {
  it('returns a SessionDTO and sets an HttpOnly cookie on valid credentials', async () => {
    mockBcryptCompare.mockResolvedValue(true);

    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([USER_RECORD]),
          }),
        }),
      }),
    };

    const mockSessionsRepo = makeMockSessionsRepo();
    mockSessionsRepo.createSession.mockResolvedValue(SESSION_RECORD);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new AuthService(
      db as any, mockConfig as any, mockEventEmitter as any,
      makeMockUsersService() as any, mockSessionsRepo as any,
    );
    const res = makeRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await service.login({ email: 'alice@example.com', password: 'pw' }, res as any);

    expect(result).toMatchObject({ id: 's1', userId: 'u1' });
    expect(res.cookie).toHaveBeenCalledWith(
      'sid',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: 'strict' }),
    );
  });

  it('stores a SHA-256 hash of the raw token — the raw token must never be persisted', async () => {
    mockBcryptCompare.mockResolvedValue(true);

    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([USER_RECORD]),
          }),
        }),
      }),
    };

    const mockSessionsRepo = makeMockSessionsRepo();
    mockSessionsRepo.createSession.mockResolvedValue(SESSION_RECORD);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new AuthService(
      db as any, mockConfig as any, mockEventEmitter as any,
      makeMockUsersService() as any, mockSessionsRepo as any,
    );
    const res = makeRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await service.login({ email: 'alice@example.com', password: 'pw' }, res as any);

    const rawToken = res.cookie.mock.calls[0][1] as string;
    const storedTokenHash = mockSessionsRepo.createSession.mock.calls[0][1] as string;

    expect(storedTokenHash).not.toBe(rawToken);
    expect(storedTokenHash).toHaveLength(64); // SHA-256 produces a 64-char hex string
  });

  it('throws UnauthorizedException when no user matches the email', async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new AuthService(
      db as any, mockConfig as any, mockEventEmitter as any,
      makeMockUsersService() as any, makeMockSessionsRepo() as any,
    );
    const res = makeRes();
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.login({ email: 'ghost@x.com', password: 'pw' }, res as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when the password does not match', async () => {
    mockBcryptCompare.mockResolvedValue(false);

    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([USER_RECORD]),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new AuthService(
      db as any, mockConfig as any, mockEventEmitter as any,
      makeMockUsersService() as any, makeMockSessionsRepo() as any,
    );
    const res = makeRes();
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.login({ email: 'alice@example.com', password: 'wrong' }, res as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for a soft-deleted user (deletedAt filter applied at DB level)', async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new AuthService(
      db as any, mockConfig as any, mockEventEmitter as any,
      makeMockUsersService() as any, makeMockSessionsRepo() as any,
    );
    const res = makeRes();
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.login({ email: 'alice@example.com', password: 'pw' }, res as any),
    ).rejects.toThrow(UnauthorizedException);
  });
});

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------

describe('AuthService — logout', () => {
  it('deletes the hashed session token via repository and clears the sid cookie', async () => {
    const mockSessionsRepo = makeMockSessionsRepo();
    mockSessionsRepo.deleteByToken.mockResolvedValue(undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new AuthService(
      {} as any, mockConfig as any, mockEventEmitter as any,
      makeMockUsersService() as any, mockSessionsRepo as any,
    );
    const res = makeRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await service.logout('raw-token-value', res as any, 'u1');

    expect(mockSessionsRepo.deleteByToken).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith('sid', expect.objectContaining({ path: '/' }));
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'audit.log',
      expect.objectContaining({ actorId: 'u1', action: 'LOGOUT', entityName: 'auth' }),
    );
  });
});

// ---------------------------------------------------------------------------
// getMe
// ---------------------------------------------------------------------------

describe('AuthService — getMe', () => {
  const SESSION_USER = { id: 'u1', email: 'alice@example.com', role: 'ADMIN' as const };

  it('returns a fully-shaped UserDTO for the authenticated user', async () => {
    const userDTO = {
      id: 'u1',
      email: 'alice@example.com',
      role: 'ADMIN' as const,
      status: 'ACTIVE' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      profile: { firstName: 'Alice', lastName: 'Smith', bio: null },
    };

    const mockUsersService = makeMockUsersService();
    mockUsersService.findOne.mockResolvedValue(userDTO);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new AuthService(
      {} as any, mockConfig as any, mockEventEmitter as any,
      mockUsersService as any, makeMockSessionsRepo() as any,
    );
    const result = await service.getMe(SESSION_USER);

    expect(result).toMatchObject({
      id: 'u1',
      role: 'ADMIN',
      profile: { firstName: 'Alice', lastName: 'Smith' },
    });
    expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('throws NotFoundException when the user no longer exists or has been soft-deleted', async () => {
    const mockUsersService = makeMockUsersService();
    mockUsersService.findOne.mockRejectedValue(new NotFoundException('User not found.'));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new AuthService(
      {} as any, mockConfig as any, mockEventEmitter as any,
      mockUsersService as any, makeMockSessionsRepo() as any,
    );
    await expect(service.getMe(SESSION_USER)).rejects.toThrow(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// login — INACTIVE / SUSPENDED status
// ---------------------------------------------------------------------------

describe('AuthService — login (status checks)', () => {
  it.each(['INACTIVE', 'SUSPENDED'] as const)(
    'throws UnauthorizedException when user status is %s',
    async (status) => {
      mockBcryptCompare.mockResolvedValue(true);

      const db = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ ...USER_RECORD, status }]),
            }),
          }),
        }),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const service = new AuthService(
        db as any, mockConfig as any, mockEventEmitter as any,
        makeMockUsersService() as any, makeMockSessionsRepo() as any,
      );
      const res = makeRes();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        service.login({ email: 'alice@example.com', password: 'pw' }, res as any),
      ).rejects.toThrow(UnauthorizedException);
    },
  );
});

// ---------------------------------------------------------------------------
// login — audit event emission
// ---------------------------------------------------------------------------

describe('AuthService — login (audit event)', () => {
  it('emits a LOGIN audit event on successful login', async () => {
    mockBcryptCompare.mockResolvedValue(true);

    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([USER_RECORD]),
          }),
        }),
      }),
    };

    const mockSessionsRepo = makeMockSessionsRepo();
    mockSessionsRepo.createSession.mockResolvedValue(SESSION_RECORD);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new AuthService(
      db as any, mockConfig as any, mockEventEmitter as any,
      makeMockUsersService() as any, mockSessionsRepo as any,
    );
    const res = makeRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await service.login({ email: 'alice@example.com', password: 'pw' }, res as any);

    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      AUDIT_LOG_EVENT,
      expect.objectContaining({ actorId: 'u1', action: 'LOGIN', entityName: 'auth' }),
    );
  });
});

// ---------------------------------------------------------------------------
// login — session creation failure
// ---------------------------------------------------------------------------

describe('AuthService — login (session creation failure)', () => {
  it('throws InternalServerErrorException when session insert returns empty', async () => {
    mockBcryptCompare.mockResolvedValue(true);

    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([USER_RECORD]),
          }),
        }),
      }),
    };

    const mockSessionsRepo = makeMockSessionsRepo();
    mockSessionsRepo.createSession.mockResolvedValue(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new AuthService(
      db as any, mockConfig as any, mockEventEmitter as any,
      makeMockUsersService() as any, mockSessionsRepo as any,
    );
    const res = makeRes();
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.login({ email: 'alice@example.com', password: 'pw' }, res as any),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
