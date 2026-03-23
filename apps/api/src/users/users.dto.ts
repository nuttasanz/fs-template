import { createZodDto } from 'nestjs-zod';
import {
  CreateUserDTOSchema,
  UpdateUserDTOSchema,
  FindUsersQueryDTOSchema,
} from '@repo/schemas';

export class CreateUserBody extends createZodDto(CreateUserDTOSchema) {}
export class UpdateUserBody extends createZodDto(UpdateUserDTOSchema) {}
export class FindUsersQuery extends createZodDto(FindUsersQueryDTOSchema) {}
