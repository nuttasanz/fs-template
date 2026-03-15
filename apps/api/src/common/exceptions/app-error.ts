import type { ErrorField } from '@repo/schemas';

export type { ErrorField };

/**
 * Application-level error with a fixed HTTP status code.
 * Extends the native Error so it is caught by any standard try/catch,
 * and carries a structured payload that HttpExceptionFilter reads directly.
 */
export class AppError extends Error {
  readonly success = false as const;
  readonly statusCode: number;
  readonly errors?: ErrorField[];

  constructor(statusCode: number, message: string, errors?: ErrorField[]) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
  }

  static badRequest(message: string, errors?: ErrorField[]): AppError {
    return new AppError(400, message, errors);
  }

  static unauthorized(message: string): AppError {
    return new AppError(401, message);
  }

  static forbidden(message: string): AppError {
    return new AppError(403, message);
  }

  static notFound(message: string): AppError {
    return new AppError(404, message);
  }

  static conflict(message: string): AppError {
    return new AppError(409, message);
  }

  static internal(message: string): AppError {
    return new AppError(500, message);
  }
}
