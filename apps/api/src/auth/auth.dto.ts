import { createZodDto } from 'nestjs-zod';
import { LoginDTOSchema } from '@repo/schemas';

export class LoginBody extends createZodDto(LoginDTOSchema) {}
