import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { randomBytes, createHash } from 'crypto';
import { and, eq, isNull, lt } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import type { LoginDTO, SessionDTO, UserDTO } from '@repo/schemas';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database/database.provider';
import { sessions, users, profiles } from '../database/schema';
import type { SessionUser } from '../common/types/session.types';
import { APP_CONFIG, type AppConfig } from '../config/config.module';
import { COOKIE_NAME } from '../common/constants/session.constants';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async login(dto: LoginDTO, res: Response): Promise<SessionDTO> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, dto.email), isNull(users.deletedAt)))
      .limit(1);

    if (!user) throw new UnauthorizedException('Invalid credentials.');

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active. Please contact an administrator.');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials.');

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const sessionTtlMs = this.config.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + sessionTtlMs);

    // Cleanup expired sessions and create a new one atomically.
    const [session] = await this.db.transaction(async (tx) => {
      await tx
        .delete(sessions)
        .where(and(eq(sessions.userId, user.id), lt(sessions.expiresAt, new Date())));

      return tx
        .insert(sessions)
        .values({ userId: user.id, token: tokenHash, expiresAt })
        .returning();
    });

    if (!session)
      throw new InternalServerErrorException('Failed to create session. Please try again.');

    // CSRF protection strategy:
    // 1. SameSite=Strict — the browser will not attach 'sid' to any cross-site
    //    requests (including top-level navigations from third-party pages).
    // 2. CORS restriction — only origins in ALLOWED_ORIGINS may make
    //    credentialed requests; attacker-controlled origins are rejected at preflight.
    // Together these make a separate CSRF token unnecessary for this session design.
    res.cookie(COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: this.config.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/',
    });

    return {
      id: session.id,
      userId: user.id,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async logout(rawToken: string, res: Response): Promise<void> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await this.db.delete(sessions).where(eq(sessions.token, tokenHash));
    res.clearCookie(COOKIE_NAME, { path: '/' });
  }

  async getMe(sessionUser: SessionUser): Promise<UserDTO> {
    const [row] = await this.db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        bio: profiles.bio,
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(and(eq(users.id, sessionUser.id), isNull(users.deletedAt)))
      .limit(1);

    if (!row) throw new NotFoundException('User not found.');

    return {
      id: row.id,
      email: row.email,
      role: row.role,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      profile: {
        firstName: row.firstName,
        lastName: row.lastName,
        bio: row.bio ?? null,
      },
    };
  }
}
