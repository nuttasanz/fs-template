import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionUser } from '../types/session.types';

/**
 * Extracts the authenticated user from the request.
 * Only valid on routes protected by SessionGuard.
 *
 * @example async getMe(@CurrentUser() user: SessionUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): SessionUser | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.sessionUser;
  },
);
