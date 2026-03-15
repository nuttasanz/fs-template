import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { AppError } from '../exceptions/app-error';
import type { ErrorField, ErrorResponse } from '@repo/schemas';

function resolveCode(status: number, hasErrors: boolean): string {
  if (status === 400 && hasErrors) return 'VALIDATION_ERROR';
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
  };
  return map[status] ?? 'INTERNAL_SERVER_ERROR';
}

/**
 * Catches all exceptions and normalises them to the shared ErrorResponse contract:
 * { success: false, message, code, errors?, timestamp, path }
 *
 * Handles AppError (application errors), NestJS HttpException (guards/core),
 * and unexpected errors. In production, 5xx responses never leak internal details.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const isProduction = process.env['NODE_ENV'] === 'production';

    // ── AppError (our custom errors) ────────────────────────────────────────
    if (exception instanceof AppError) {
      const status = exception.statusCode;

      if (status >= 500 && isProduction) {
        res.status(status).json({
          success: false,
          message: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        } satisfies ErrorResponse);
        return;
      }

      const hasErrors = (exception.errors?.length ?? 0) > 0;
      res.status(status).json({
        success: false,
        message: exception.message,
        code: resolveCode(status, hasErrors),
        ...(hasErrors && { errors: exception.errors }),
      } satisfies ErrorResponse);
      return;
    }

    // ── NestJS HttpException (thrown by guards, pipes, core) ────────────────
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();

      let message = 'An error occurred';
      let errors: ErrorField[] | undefined;

      if (typeof raw === 'string') {
        message = raw;
      } else if (raw !== null && typeof raw === 'object') {
        const r = raw as Record<string, unknown>;
        const msg = r['message'];
        if (typeof msg === 'string') {
          message = msg;
        } else if (Array.isArray(msg)) {
          message = 'Validation failed';
          errors = (msg as string[]).map((m) => ({ field: '_root', message: m }));
        }
      }

      const hasErrors = (errors?.length ?? 0) > 0;
      res.status(status).json({
        success: false,
        message,
        code: resolveCode(status, hasErrors),
        ...(hasErrors && { errors }),
      } satisfies ErrorResponse);
      return;
    }

    // ── Unexpected / unhandled error ─────────────────────────────────────────
    console.error('[HttpExceptionFilter] Unhandled exception:', exception);

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: isProduction ? 'Internal server error' : String(exception),
      code: 'INTERNAL_SERVER_ERROR',
    } satisfies ErrorResponse);
  }
}
