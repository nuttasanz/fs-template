import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, tap } from 'rxjs';
import { AUDIT_LOG_EVENT, AuditLogEvent } from '../events/audit-log.event';

const SENSITIVE_FIELDS = new Set(['password', 'passwordHash', 'token', 'secret']);

function sanitizeChanges(body: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    sanitized[key] = SENSITIVE_FIELDS.has(key) ? '[REDACTED]' : value;
  }
  return sanitized;
}

const METHOD_TO_ACTION: Record<string, string> = {
  POST: 'CREATE',
  PATCH: 'UPDATE',
  PUT: 'UPDATE',
  DELETE: 'DELETE',
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = ctx.switchToHttp().getRequest<Request>();
    const action = METHOD_TO_ACTION[request.method];

    if (!action) return next.handle();

    return next.handle().pipe(
      tap(() => {
        // Extract entity name: /api/v1/users/123 → skip 'api' prefix and 'v{n}' version segment → 'users'
        const segments = request.path.split('/').filter(Boolean);
        const versionIndex = segments.findIndex((s) => /^v\d+$/.test(s));
        const entityName = segments[versionIndex + 1] ?? segments[1] ?? 'unknown';
        const targetId = request.params['id'] ?? null;
        const changes =
          action !== 'DELETE' ? sanitizeChanges(request.body as Record<string, unknown>) : null;

        this.eventEmitter.emit(
          AUDIT_LOG_EVENT,
          new AuditLogEvent(
            request.sessionUser?.id ?? null,
            action,
            targetId,
            entityName,
            changes,
            request.ip ?? null,
          ),
        );
      }),
    );
  }
}
