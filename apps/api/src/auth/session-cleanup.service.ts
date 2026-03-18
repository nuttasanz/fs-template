import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { lt } from 'drizzle-orm';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database/database.provider';
import { sessions } from '../database/schema';

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeExpiredSessions(): Promise<void> {
    await this.db
      .delete(sessions)
      .where(lt(sessions.expiresAt, new Date()));
    this.logger.log('Purged expired sessions.');
  }
}
