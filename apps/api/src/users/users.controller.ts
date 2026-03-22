import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  CreateUserDTOSchema,
  UpdateUserDTOSchema,
  UserRoleSchema,
  UserStatusSchema,
  type CreateUserDTO,
  type UpdateUserDTO,
  type UserDTO,
} from '@repo/schemas';
import { UsersService, type FindUsersQuery } from './users.service';
import { PaginatedResponse } from '../common/responses/paginated.response';
import { SessionGuard } from '../common/guards/session.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { swaggerErrorSchema } from '../common/swagger/error-schema.swagger';
import type { SessionUser } from '../common/types/session.types';

@ApiTags('users')
@ApiCookieAuth('sid')
@Controller('users')
@UseGuards(SessionGuard, RbacGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with cursor-based pagination and optional filters' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: 'Opaque pagination cursor from previous response',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'role', required: false, enum: ['SUPER_ADMIN', 'ADMIN', 'USER'] })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] })
  @ApiResponse({ status: 200, description: 'Cursor-paginated list of users.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid pagination cursor.',
    schema: swaggerErrorSchema('BAD_REQUEST', '/api/v1/users'),
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated.',
    schema: swaggerErrorSchema('AUTH_UNAUTHORIZED', '/api/v1/users'),
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient role.',
    schema: swaggerErrorSchema('FORBIDDEN', '/api/v1/users'),
  })
  @ResponseMessage('Users retrieved.')
  async findAll(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ): Promise<PaginatedResponse<UserDTO>> {
    const query: FindUsersQuery = {
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
      role: role ? UserRoleSchema.optional().parse(role) : undefined,
      status: status ? UserStatusSchema.optional().parse(status) : undefined,
    };
    const result = await this.usersService.findAll(query);
    return new PaginatedResponse(result.data, {
      nextCursor: result.nextCursor,
      limit: result.limit,
    });
  }

  // Must be declared before @Get(':id') to prevent 'stats' being parsed as a UUID param.
  @Get('stats')
  @ResponseMessage('Stats retrieved.')
  @ApiOperation({ summary: 'Get aggregate counts for dashboard — total users and active sessions' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard aggregate stats.',
    schema: {
      type: 'object',
      properties: {
        totalUsers: { type: 'number', example: 42 },
        activeSessions: { type: 'number', example: 7 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated.',
    schema: swaggerErrorSchema('AUTH_UNAUTHORIZED', '/api/v1/users/stats'),
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient role.',
    schema: swaggerErrorSchema('FORBIDDEN', '/api/v1/users/stats'),
  })
  getStats(): Promise<{ totalUsers: number; activeSessions: number }> {
    return this.usersService.getStats();
  }

  @Get(':id')
  @ResponseMessage('User retrieved.')
  @ApiOperation({ summary: 'Get a single user by ID' })
  @ApiResponse({ status: 200, description: 'The requested user.' })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated.',
    schema: swaggerErrorSchema('AUTH_UNAUTHORIZED', '/api/v1/users/:id'),
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient role.',
    schema: swaggerErrorSchema('FORBIDDEN', '/api/v1/users/:id'),
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
    schema: swaggerErrorSchema('NOT_FOUND', '/api/v1/users/:id'),
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserDTO> {
    return this.usersService.findOne(id);
  }

  @Post()
  @Throttle({ global: { ttl: 15 * 60 * 1000, limit: 10 } })
  @ResponseMessage('User created.')
  @ApiOperation({ summary: 'Create a new user (ADMIN+ only)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'role'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 },
        role: { type: 'string', enum: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        bio: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User created.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed.',
    schema: swaggerErrorSchema('VALIDATION_FAILED', '/api/v1/users'),
  })
  @ApiResponse({
    status: 403,
    description: 'Cannot assign a role >= your own.',
    schema: swaggerErrorSchema('FORBIDDEN', '/api/v1/users'),
  })
  @ApiResponse({
    status: 409,
    description: 'Email already in use.',
    schema: swaggerErrorSchema('CONFLICT', '/api/v1/users'),
  })
  create(
    @Body(new ZodValidationPipe(CreateUserDTOSchema)) dto: CreateUserDTO,
    @CurrentUser() actor: SessionUser,
  ): Promise<UserDTO> {
    return this.usersService.create(dto, actor);
  }

  @Patch(':id')
  @Throttle({ global: { ttl: 15 * 60 * 1000, limit: 10 } })
  @ResponseMessage('User updated.')
  @ApiOperation({ summary: 'Update a user (RBAC-enforced)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        bio: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Updated user.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed.',
    schema: swaggerErrorSchema('VALIDATION_FAILED', '/api/v1/users/:id'),
  })
  @ApiResponse({
    status: 403,
    description: 'Cannot modify a user with a role >= your own.',
    schema: swaggerErrorSchema('FORBIDDEN', '/api/v1/users/:id'),
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
    schema: swaggerErrorSchema('NOT_FOUND', '/api/v1/users/:id'),
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateUserDTOSchema)) dto: UpdateUserDTO,
    @CurrentUser() actor: SessionUser,
  ): Promise<UserDTO> {
    return this.usersService.update(id, dto, actor);
  }

  @Delete(':id')
  @Throttle({ global: { ttl: 15 * 60 * 1000, limit: 10 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a user (RBAC-enforced)' })
  @ApiResponse({ status: 204, description: 'User deleted (soft).' })
  @ApiResponse({
    status: 403,
    description: 'Cannot delete a user with a role >= your own.',
    schema: swaggerErrorSchema('FORBIDDEN', '/api/v1/users/:id'),
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
    schema: swaggerErrorSchema('NOT_FOUND', '/api/v1/users/:id'),
  })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: SessionUser): Promise<void> {
    return this.usersService.remove(id, actor);
  }
}
