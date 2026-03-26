import { Inject, Injectable, Logger } from '@nestjs/common';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../../database/database.provider';
import { auditLogs } from '../../database/schema';

@Injectable()
export class AuditLogRepository {
  private readonly logger = new Logger(AuditLogRepository.name);

  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async create(entry: {
    actorId: string | null;
    action: string;
    targetId: string | null;
    entityName: string;
    changes: Record<string, unknown> | null;
    ipAddress: string | null;
  }): Promise<void> {
    try {
      await this.db.insert(auditLogs).values(entry);
    } catch (err) {
      // Audit failures must never crash the application. Log and continue.
      this.logger.error('Failed to write audit log entry', err instanceof Error ? err.stack : err);
    }
  }
}
