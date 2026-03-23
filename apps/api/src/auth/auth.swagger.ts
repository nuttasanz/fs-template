import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { swaggerErrorSchema } from '../common/swagger/error-schema.swagger';

export function ApiLoginDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Authenticate and receive a session cookie' }),
    ApiResponse({ status: 200, description: 'Login successful. Sets HttpOnly sid cookie.' }),
    ApiResponse({
      status: 400,
      description: 'Validation failed.',
      schema: swaggerErrorSchema('VALIDATION_FAILED', '/api/v1/auth/login'),
    }),
    ApiResponse({
      status: 401,
      description: 'Invalid credentials.',
      schema: swaggerErrorSchema('AUTH_UNAUTHORIZED', '/api/v1/auth/login'),
    }),
    ApiResponse({
      status: 429,
      description: 'Too many login attempts.',
      schema: swaggerErrorSchema('BAD_REQUEST', '/api/v1/auth/login'),
    }),
  );
}

export function ApiLogoutDocs() {
  return applyDecorators(
    ApiCookieAuth('sid'),
    ApiOperation({ summary: 'Invalidate the current session and clear the cookie' }),
    ApiResponse({ status: 204, description: 'Logged out successfully.' }),
    ApiResponse({
      status: 401,
      description: 'Not authenticated.',
      schema: swaggerErrorSchema('AUTH_UNAUTHORIZED', '/api/v1/auth/logout'),
    }),
  );
}

export function ApiGetMeDocs() {
  return applyDecorators(
    ApiCookieAuth('sid'),
    ApiOperation({ summary: 'Return the currently authenticated user' }),
    ApiResponse({ status: 200, description: 'The authenticated user.' }),
    ApiResponse({
      status: 401,
      description: 'Not authenticated.',
      schema: swaggerErrorSchema('AUTH_UNAUTHORIZED', '/api/v1/auth/me'),
    }),
  );
}
