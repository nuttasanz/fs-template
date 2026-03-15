import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../../database/database.provider';
import { auditLogs } from '../../database/schema';

const METHOD_TO_ACTION: Record<string, string> = {
  POST: 'CREATE',
  PATCH: 'UPDATE',
  PUT: 'UPDATE',
  DELETE: 'DELETE',
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = ctx.switchToHttp().getRequest<Request>();
    const action = METHOD_TO_ACTION[request.method];

    if (!action) return next.handle();

    return next.handle().pipe(
      tap(() => {
        void this.writeAuditLog(request, action);
      }),
    );
  }

  private async writeAuditLog(request: Request, action: string): Promise<void> {
    try {
      // Extract entity name from the second path segment: /api/users/123 → users
      const entityName = request.path.split('/').filter(Boolean)[1] ?? 'unknown';
      const targetId = request.params['id'] ?? null;
      const changes = action !== 'DELETE' ? (request.body as Record<string, unknown>) : null;

      await this.db.insert(auditLogs).values({
        actorId: request.sessionUser?.id ?? null,
        action,
        targetId,
        entityName,
        changes,
        ipAddress: request.ip ?? null,
      });
    } catch (err) {
      // Audit failures must never crash the main request. Log and continue.
      console.error('[AuditLog] Failed to write audit log entry:', err);
    }
  }
}
