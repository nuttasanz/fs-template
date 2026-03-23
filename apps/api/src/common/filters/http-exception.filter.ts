import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../exceptions/app-error';
import { isPgDatabaseError } from '../types/pg-error.types';
import { ErrorCode } from '@repo/schemas';
import type { ErrorField, ErrorResponse } from '@repo/schemas';

function resolveCode(status: number, hasErrors: boolean): ErrorCode {
  if (status === 400 && hasErrors) return ErrorCode.VALIDATION_FAILED;
  const map: Partial<Record<number, ErrorCode>> = {
    400: ErrorCode.BAD_REQUEST,
    401: ErrorCode.AUTH_UNAUTHORIZED,
    403: ErrorCode.FORBIDDEN,
    404: ErrorCode.NOT_FOUND,
    409: ErrorCode.CONFLICT,
    422: ErrorCode.UNPROCESSABLE_ENTITY,
  };
  return map[status] ?? ErrorCode.INTERNAL_ERROR;
}

/**
 * Catches all exceptions and normalises them to the shared ErrorResponse contract:
 * { success: false, message, code, errors? }
 *
 * Catch order (most-specific → least-specific):
 *   AppError → ZodError → pg DatabaseError → HttpException → unexpected
 *
 * In production, 5xx responses never leak internal details.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isProduction = process.env['NODE_ENV'] === 'production';
    const meta = { timestamp: new Date().toISOString(), path: req.url };

    // ── AppError (our custom errors) ────────────────────────────────────────
    if (exception instanceof AppError) {
      const status = exception.statusCode;

      if (status >= 500 && isProduction) {
        res.status(status).json({
          success: false,
          message: 'Internal server error',
          code: ErrorCode.INTERNAL_ERROR,
          ...meta,
        } satisfies ErrorResponse);
        return;
      }

      const hasErrors = (exception.errors?.length ?? 0) > 0;
      res.status(status).json({
        success: false,
        message: exception.message,
        code: resolveCode(status, hasErrors),
        ...(hasErrors && { errors: exception.errors }),
        ...meta,
      } satisfies ErrorResponse);
      return;
    }

    // ── ZodError (direct schema.parse() calls in services) ──────────────────
    if (exception instanceof ZodError) {
      const errors: ErrorField[] = exception.issues.map((issue) => ({
        field: issue.path.length > 0 ? issue.path.join('.') : '_root',
        message: issue.message,
      }));
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Validation failed',
        code: ErrorCode.VALIDATION_FAILED,
        errors,
        ...meta,
      } satisfies ErrorResponse);
      return;
    }

    // ── pg DatabaseError (5-character SQLSTATE code, e.g. '23505') ──────────
    // Services catch known codes (unique violation etc.) and re-throw as AppError,
    // so this branch only fires on genuinely unexpected database failures.
    if (isPgDatabaseError(exception)) {
      this.logger.error('Database error', exception.stack);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: isProduction ? 'Internal server error' : exception.message,
        code: ErrorCode.INTERNAL_ERROR,
        ...meta,
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
        ...meta,
      } satisfies ErrorResponse);
      return;
    }

    // ── Unexpected / unhandled error ─────────────────────────────────────────
    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : String(exception),
    );

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: isProduction ? 'Internal server error' : String(exception),
      code: ErrorCode.INTERNAL_ERROR,
      ...meta,
    } satisfies ErrorResponse);
  }
}
