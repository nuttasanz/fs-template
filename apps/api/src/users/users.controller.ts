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
import {
  CreateUserDTOSchema,
  UpdateUserDTOSchema,
  UserRoleSchema,
  UserStatusSchema,
  type CreateUserDTO,
  type UpdateUserDTO,
  type UserDTO,
} from '@repo/schemas';
import { UsersService, type FindUsersQuery, type PaginatedUsers } from './users.service';
import { SessionGuard } from '../common/guards/session.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { SessionUser } from '../common/types/session.types';

@ApiTags('users')
@ApiCookieAuth('sid')
@Controller('users')
@UseGuards(SessionGuard, RbacGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with pagination and optional filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'role', required: false, enum: ['SUPER_ADMIN', 'ADMIN', 'USER'] })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] })
  @ApiResponse({ status: 200, description: 'Paginated list of users.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'Insufficient role.' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ): Promise<PaginatedUsers> {
    const query: FindUsersQuery = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      role: role ? UserRoleSchema.optional().parse(role) : undefined,
      status: status ? UserStatusSchema.optional().parse(status) : undefined,
    };
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single user by ID' })
  @ApiResponse({ status: 200, description: 'The requested user.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserDTO> {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user (ADMIN+ only)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'role'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 12 },
        role: { type: 'string', enum: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        bio: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User created.' })
  @ApiResponse({ status: 403, description: 'Cannot assign a role >= your own.' })
  @ApiResponse({ status: 409, description: 'Email already in use.' })
  create(
    @Body(new ZodValidationPipe(CreateUserDTOSchema)) dto: CreateUserDTO,
    @CurrentUser() actor: SessionUser,
  ): Promise<UserDTO> {
    return this.usersService.create(dto, actor);
  }

  @Patch(':id')
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
  @ApiResponse({ status: 403, description: 'Cannot modify a user with a role >= your own.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateUserDTOSchema)) dto: UpdateUserDTO,
    @CurrentUser() actor: SessionUser,
  ): Promise<UserDTO> {
    return this.usersService.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a user (RBAC-enforced)' })
  @ApiResponse({ status: 204, description: 'User deleted (soft).' })
  @ApiResponse({ status: 403, description: 'Cannot delete a user with a role >= your own.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: SessionUser,
  ): Promise<void> {
    return this.usersService.remove(id, actor);
  }
}
