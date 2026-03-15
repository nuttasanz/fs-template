import { PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { AppError } from '../exceptions/app-error';

/**
 * Validates and transforms an incoming value against a Zod schema.
 * On failure, throws an AppError(400) with a flat per-field errors array.
 *
 * @example
 *   @Body(new ZodValidationPipe(CreateUserDTOSchema)) body: CreateUserDTO
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.length > 0 ? issue.path.join('.') : '_root',
        message: issue.message,
      }));
      throw AppError.badRequest('Validation failed', errors);
    }
    return result.data;
  }
}
