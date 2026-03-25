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
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  CreateUserDTO,
  CreateUserDTOSchema,
  FindUsersQueryDTO,
  FindUsersQueryDTOSchema,
  UpdateUserDTO,
  UpdateUserDTOSchema,
  type UserDTO,
  type UserStatsDTO,
} from '@repo/schemas';
import { UsersService } from './users.service';
import {
  ApiFindAllUsersDocs,
  ApiGetStatsDocs,
  ApiGetUserDocs,
  ApiCreateUserDocs,
  ApiUpdateUserDocs,
  ApiDeleteUserDocs,
} from './users.swagger';
import { PaginatedResponse } from '../common/responses/paginated.response';
import { SessionGuard } from '../common/guards/session.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import type { SessionUser } from '../common/types/session.types';
import { ZodValidationPipe } from 'nestjs-zod';

@ApiTags('users')
@ApiCookieAuth('sid')
@Controller('users')
@UseGuards(SessionGuard, RbacGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiFindAllUsersDocs()
  @ResponseMessage('Users retrieved.')
  async findAll(
    @Query(new ZodValidationPipe(FindUsersQueryDTOSchema)) query: FindUsersQueryDTO,
  ): Promise<PaginatedResponse<UserDTO>> {
    const result = await this.usersService.findAll(query);
    return new PaginatedResponse(result.data, {
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      pageSize: result.pageSize,
    });
  }

  // Must be declared before @Get(':id') to prevent 'stats' being parsed as a UUID param.
  @Get('stats')
  @ApiGetStatsDocs()
  @ResponseMessage('Stats retrieved.')
  getStats(): Promise<UserStatsDTO> {
    return this.usersService.getStats();
  }

  @Get(':id')
  @ApiGetUserDocs()
  @ResponseMessage('User retrieved.')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserDTO> {
    return this.usersService.findOne(id);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } })
  @ApiCreateUserDocs()
  @ResponseMessage('User created.')
  create(
    @Body(new ZodValidationPipe(CreateUserDTOSchema)) dto: CreateUserDTO,
    @CurrentUser() actor: SessionUser,
  ): Promise<UserDTO> {
    return this.usersService.create(dto, actor);
  }

  @Patch(':id')
  @Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } })
  @ApiUpdateUserDocs()
  @ResponseMessage('User updated.')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateUserDTOSchema)) dto: UpdateUserDTO,
    @CurrentUser() actor: SessionUser,
  ): Promise<UserDTO> {
    return this.usersService.update(id, dto, actor);
  }

  @Delete(':id')
  @Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteUserDocs()
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: SessionUser): Promise<void> {
    return this.usersService.remove(id, actor);
  }
}
