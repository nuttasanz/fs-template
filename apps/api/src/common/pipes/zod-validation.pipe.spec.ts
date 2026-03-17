import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';
import { AppError } from '../exceptions/app-error';

const TestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  age: z.number().int().positive('Age must be positive'),
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(TestSchema);

  it('returns the parsed value when input is valid', () => {
    const input = { name: 'Alice', age: 30 };
    expect(pipe.transform(input)).toEqual(input);
  });

  it('throws AppError(400) with field errors when input is invalid', () => {
    expect.assertions(4);
    try {
      pipe.transform({ name: '', age: -1 });
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(400);
      expect(appErr.errors).toBeDefined();
      const fields = appErr.errors!.map((e) => e.field);
      expect(fields).toContain('name');
    }
  });

  it('uses _root as field name for top-level (non-nested) errors', () => {
    const primitiveSchema = z.string().min(1, 'Required');
    const primitivePipe = new ZodValidationPipe(primitiveSchema);

    expect.assertions(2);
    try {
      primitivePipe.transform('');
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.errors).toBeDefined();
      expect(appErr.errors![0]?.field).toBe('_root');
    }
  });
});
