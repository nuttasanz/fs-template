import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/**
 * Validates and transforms an incoming value against a Zod schema.
 * Use at the parameter level for request body validation.
 *
 * @example
 *   @Body(new ZodValidationPipe(CreateUserDTOSchema)) body: CreateUserDTO
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }
}
