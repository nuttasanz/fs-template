import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { swaggerErrorSchema } from '../common/swagger/error-schema.swagger';

export function ApiFindAllUsersDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'List users with offset-based pagination and optional filters' }),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 }),
    ApiQuery({ name: 'role', required: false, enum: ['SUPER_ADMIN', 'ADMIN', 'USER'] }),
    ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] }),
    ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name' }),
    ApiResponse({ status: 200, description: 'Paginated list of users.' }),
    ApiResponse({
      status: 401,
      description: 'Not authenticated.',
      schema: swaggerErrorSchema('AUTH_UNAUTHORIZED', '/api/v1/users'),
    }),
    ApiResponse({
      status: 403,
      description: 'Insufficient role.',
      schema: swaggerErrorSchema('FORBIDDEN', '/api/v1/users'),
    }),
  );
}

export function ApiGetStatsDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get aggregate counts for dashboard — total users and active sessions' }),
    ApiResponse({
      status: 200,
      description: 'Dashboard aggregate stats.',
      schema: {
        type: 'object',
        properties: {
          totalUsers: { type: 'number', example: 42 },
          activeSessions: { type: 'number', example: 7 },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Not authenticated.',
      schema: swaggerErrorSchema('AUTH_UNAUTHORIZED', '/api/v1/users/stats'),
    }),
    ApiResponse({
      status: 403,
      description: 'Insufficient role.',
      schema: swaggerErrorSchema('FORBIDDEN', '/api/v1/users/stats'),
    }),
  );
}

export function ApiGetUserDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a single user by ID' }),
    ApiResponse({ status: 200, description: 'The requested user.' }),
    ApiResponse({
      status: 401,
      description: 'Not authenticated.',
      schema: swaggerErrorSchema('AUTH_UNAUTHORIZED', '/api/v1/users/:id'),
    }),
    ApiResponse({
      status: 403,
      description: 'Insufficient role.',
      schema: swaggerErrorSchema('FORBIDDEN', '/api/v1/users/:id'),
    }),
    ApiResponse({
      status: 404,
      description: 'User not found.',
      schema: swaggerErrorSchema('NOT_FOUND', '/api/v1/users/:id'),
    }),
  );
}

export function ApiCreateUserDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new user (ADMIN+ only)' }),
    ApiResponse({ status: 201, description: 'User created.' }),
    ApiResponse({
      status: 400,
      description: 'Validation failed.',
      schema: swaggerErrorSchema('VALIDATION_FAILED', '/api/v1/users'),
    }),
    ApiResponse({
      status: 403,
      description: 'Cannot assign a role >= your own.',
      schema: swaggerErrorSchema('FORBIDDEN', '/api/v1/users'),
    }),
    ApiResponse({
      status: 409,
      description: 'Email already in use.',
      schema: swaggerErrorSchema('CONFLICT', '/api/v1/users'),
    }),
  );
}

export function ApiUpdateUserDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a user (RBAC-enforced)' }),
    ApiResponse({ status: 200, description: 'Updated user.' }),
    ApiResponse({
      status: 400,
      description: 'Validation failed.',
      schema: swaggerErrorSchema('VALIDATION_FAILED', '/api/v1/users/:id'),
    }),
    ApiResponse({
      status: 403,
      description: 'Cannot modify a user with a role >= your own.',
      schema: swaggerErrorSchema('FORBIDDEN', '/api/v1/users/:id'),
    }),
    ApiResponse({
      status: 404,
      description: 'User not found.',
      schema: swaggerErrorSchema('NOT_FOUND', '/api/v1/users/:id'),
    }),
  );
}

export function ApiDeleteUserDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Soft-delete a user (RBAC-enforced)' }),
    ApiResponse({ status: 204, description: 'User deleted (soft).' }),
    ApiResponse({
      status: 403,
      description: 'Cannot delete a user with a role >= your own.',
      schema: swaggerErrorSchema('FORBIDDEN', '/api/v1/users/:id'),
    }),
    ApiResponse({
      status: 404,
      description: 'User not found.',
      schema: swaggerErrorSchema('NOT_FOUND', '/api/v1/users/:id'),
    }),
  );
}
