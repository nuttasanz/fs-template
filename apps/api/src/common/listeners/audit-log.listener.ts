import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AUDIT_LOG_EVENT, AuditLogEvent } from '../events/audit-log.event';
import { AuditLogRepository } from '../repositories/audit-log.repository';

@Injectable()
export class AuditLogListener {
  constructor(private readonly auditLogRepo: AuditLogRepository) {}

  @OnEvent(AUDIT_LOG_EVENT, { async: true })
  async handleAuditLog(event: AuditLogEvent): Promise<void> {
    await this.auditLogRepo.create({
      actorId: event.actorId,
      action: event.action,
      targetId: event.targetId,
      entityName: event.entityName,
      changes: event.changes,
      ipAddress: event.ipAddress,
    });
  }
}

