import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull, lt } from 'drizzle-orm';
import { createHash } from 'crypto';
import type { UserRole } from '@repo/schemas';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database/database.provider';
import { sessions, users } from '../database/schema';

export interface SessionRow {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface SessionUserRow {
  userId: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class SessionsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  /**
   * Look up a valid session by raw token. Validates that the session is not expired,
   * the user is active, and the user is not soft-deleted.
   */
  async findValidSession(rawToken: string): Promise<SessionUserRow | null> {
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
          eq(users.status, 'ACTIVE'),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  /** Delete expired sessions for a specific user and create a new session. */
  async createSession(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<SessionRow | null> {
    const [session] = await this.db.transaction(async (tx) => {
      await tx
        .delete(sessions)
        .where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));

      return tx
        .insert(sessions)
        .values({ userId, token: tokenHash, expiresAt })
        .returning();
    });

    return session ?? null;
  }

  /** Delete a session by its hashed token. */
  async deleteByToken(tokenHash: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.token, tokenHash));
  }
}
