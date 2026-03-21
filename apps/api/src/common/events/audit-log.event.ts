export const AUDIT_LOG_EVENT = 'audit.log';

export class AuditLogEvent {
  constructor(
    public readonly actorId: string | null,
    public readonly action: string,
    public readonly targetId: string | null,
    public readonly entityName: string,
    public readonly changes: Record<string, unknown> | null,
    public readonly ipAddress: string | null,
  ) {}
}
