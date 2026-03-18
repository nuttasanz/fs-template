import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { createHash } from 'crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../../database/database.provider';
import { sessions, users } from '../../database/schema';
import { COOKIE_NAME } from '../constants/session.constants';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest<Request>();
    const rawToken: string | undefined = request.cookies[COOKIE_NAME];

    if (!rawToken) {
      throw new UnauthorizedException('No session token provided.');
    }

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const [row] = await this.db
      .select({
        userId: sessions.userId,
        email: users.email,
        role: users.role,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.token, tokenHash),
          gt(sessions.expiresAt, new Date()),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (!row) {
      throw new UnauthorizedException('Session is invalid or has expired.');
    }

    request.sessionUser = { id: row.userId, email: row.email, role: row.role };
    return true;
  }
}
