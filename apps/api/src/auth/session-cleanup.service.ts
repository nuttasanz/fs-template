import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { sql } from 'drizzle-orm';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database/database.provider';

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);
  private readonly BATCH_SIZE = 1000;

  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeExpiredSessions(): Promise<void> {
    try {
      let total = 0;
      let deleted: number;

      do {
        const result = await this.db.execute(
          sql`DELETE FROM sessions WHERE id IN (
            SELECT id FROM sessions WHERE expires_at < NOW() LIMIT ${this.BATCH_SIZE}
          )`,
        );
        deleted = result.rowCount ?? 0;
        total += deleted;
      } while (deleted > 0);

      this.logger.log(`Purged ${total} expired sessions.`);
    } catch (error) {
      this.logger.error(
        'Failed to purge expired sessions',
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
