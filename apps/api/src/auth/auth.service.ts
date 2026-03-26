import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { randomBytes, createHash } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import type { LoginDTO, SessionDTO, UserDTO } from '@repo/schemas';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database/database.provider';
import { users } from '../database/schema';
import { and, eq, isNull } from 'drizzle-orm';
import type { SessionUser } from '../common/types/session.types';
import { APP_CONFIG, type AppConfig } from '../config/config.module';
import { COOKIE_NAME, daysToMs } from '../common/constants/session.constants';
import { AUDIT_LOG_EVENT, AuditLogEvent } from '../common/events/audit-log.event';
import { UsersService } from '../users/users.service';
import { SessionsRepository } from './sessions.repository';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly eventEmitter: EventEmitter2,
    private readonly usersService: UsersService,
    private readonly sessionsRepo: SessionsRepository,
  ) {}

  async login(dto: LoginDTO, res: Response): Promise<SessionDTO> {
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        status: users.status,
        passwordHash: users.passwordHash,
      })
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
    const sessionTtlMs = daysToMs(this.config.SESSION_TTL_DAYS);
    const expiresAt = new Date(Date.now() + sessionTtlMs);

    const session = await this.sessionsRepo.createSession(user.id, tokenHash, expiresAt);

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

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLogEvent(user.id, 'LOGIN', user.id, 'auth', null, null),
    );

    return {
      id: session.id,
      userId: user.id,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async logout(rawToken: string, res: Response, actorId: string): Promise<void> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await this.sessionsRepo.deleteByToken(tokenHash);
    res.clearCookie(COOKIE_NAME, { path: '/' });

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLogEvent(actorId, 'LOGOUT', actorId, 'auth', null, null),
    );
  }

  getMe(sessionUser: SessionUser): Promise<UserDTO> {
    return this.usersService.findOne(sessionUser.id);
  }
}
