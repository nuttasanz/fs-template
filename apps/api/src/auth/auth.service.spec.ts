import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt');
const mockBcryptCompare = bcrypt.compare as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRes() {
  return { cookie: jest.fn(), clearCookie: jest.fn() };
}

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
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------

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
      delete: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([SESSION_RECORD]),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new AuthService(db as any);
    const res = makeRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await service.login({ email: 'alice@example.com', password: 'pw' }, res as any);

    expect(result).toMatchObject({ id: 's1', userId: 'u1' });
    expect(res.cookie).toHaveBeenCalledWith(
      'sid',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
    );
  });

  it('stores a SHA-256 hash of the raw token — the raw token must never be persisted', async () => {
    mockBcryptCompare.mockResolvedValue(true);

    const insertValues = jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([SESSION_RECORD]),
    });

    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([USER_RECORD]),
          }),
        }),
      }),
      delete: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }),
      insert: jest.fn().mockReturnValue({ values: insertValues }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new AuthService(db as any);
    const res = makeRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await service.login({ email: 'alice@example.com', password: 'pw' }, res as any);

    const rawToken = res.cookie.mock.calls[0][1] as string;
    const storedToken = (insertValues.mock.calls[0][0] as { token: string }).token;

    expect(storedToken).not.toBe(rawToken);
    expect(storedToken).toHaveLength(64); // SHA-256 produces a 64-char hex string
  });

  it('throws AppError(401) when no user matches the email', async () => {
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
    const service = new AuthService(db as any);
    const res = makeRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(service.login({ email: 'ghost@x.com', password: 'pw' }, res as any)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('throws AppError(401) when the password does not match', async () => {
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
    const service = new AuthService(db as any);
    const res = makeRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(service.login({ email: 'alice@example.com', password: 'wrong' }, res as any)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('throws AppError(401) for a soft-deleted user (deletedAt filter applied at DB level)', async () => {
    // The query filters `isNull(users.deletedAt)`, so deleted users return an empty array.
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
    const service = new AuthService(db as any);
    const res = makeRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(service.login({ email: 'alice@example.com', password: 'pw' }, res as any)).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------

describe('AuthService — logout', () => {
  it('deletes the hashed session token from the DB and clears the sid cookie', async () => {
    const deleteWhere = jest.fn().mockResolvedValue(undefined);
    const db = {
      delete: jest.fn().mockReturnValue({ where: deleteWhere }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new AuthService(db as any);
    const res = makeRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await service.logout('raw-token-value', res as any);

    expect(db.delete).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith('sid', expect.objectContaining({ path: '/' }));
  });
});

// ---------------------------------------------------------------------------
// getMe
// ---------------------------------------------------------------------------

describe('AuthService — getMe', () => {
  const SESSION_USER = { id: 'u1', email: 'alice@example.com', role: 'ADMIN' as const };

  it('returns a fully-shaped UserDTO for the authenticated user', async () => {
    const row = {
      id: 'u1',
      email: 'alice@example.com',
      role: 'ADMIN' as const,
      status: 'ACTIVE' as const,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      firstName: 'Alice',
      lastName: 'Smith',
      bio: null,
    };

    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([row]),
            }),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new AuthService(db as any);
    const result = await service.getMe(SESSION_USER);

    expect(result).toMatchObject({
      id: 'u1',
      role: 'ADMIN',
      profile: { firstName: 'Alice', lastName: 'Smith' },
    });
    expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('throws AppError(404) when the user no longer exists or has been soft-deleted', async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new AuthService(db as any);
    await expect(service.getMe(SESSION_USER)).rejects.toMatchObject({ statusCode: 404 });
  });
});
