import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

interface ErrorResponse {
  success: false;
  message: string;
  errors: string[];
}

/**
 * Catches all exceptions and normalises them to:
 * { success: false, message: string, errors: string[] }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: ErrorResponse = {
      success: false,
      message: 'Internal server error',
      errors: [],
    };

    if (exception instanceof HttpException) {
      const raw = exception.getResponse();

      if (typeof raw === 'string') {
        body.message = raw;
      } else if (raw !== null && typeof raw === 'object') {
        const r = raw as Record<string, unknown>;
        const msg = r['message'];

        if (typeof msg === 'string') {
          body.message = msg;
        } else if (Array.isArray(msg)) {
          // Class-validator style: message is string[]
          body.message = 'Validation failed';
          body.errors = msg as string[];
        } else if (msg !== null && typeof msg === 'object') {
          // ZodValidationPipe: message is { formErrors: string[], fieldErrors: Record<string, string[]> }
          body.message = 'Validation failed';
          const m = msg as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
          const fieldErrors = Object.entries(m.fieldErrors ?? {}).flatMap(([field, errs]) =>
            (errs ?? []).map((e) => `${field}: ${e}`),
          );
          body.errors = [...(m.formErrors ?? []), ...fieldErrors];
        }
      }
    }

    res.status(status).json(body);
  }
}
