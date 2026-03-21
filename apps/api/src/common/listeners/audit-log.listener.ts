import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../../database/database.provider';
import { auditLogs } from '../../database/schema';
import { AUDIT_LOG_EVENT, AuditLogEvent } from '../events/audit-log.event';

@Injectable()
export class AuditLogListener {
  private readonly logger = new Logger(AuditLogListener.name);

  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  @OnEvent(AUDIT_LOG_EVENT, { async: true })
  async handleAuditLog(event: AuditLogEvent): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        actorId: event.actorId,
        action: event.action,
        targetId: event.targetId,
        entityName: event.entityName,
        changes: event.changes,
        ipAddress: event.ipAddress,
      });
    } catch (err) {
      // Audit failures must never crash the application. Log and continue.
      this.logger.error('Failed to write audit log entry', err instanceof Error ? err.stack : err);
    }
  }
}
