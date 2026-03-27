import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UserRole } from '@repo/schemas';
import { ROLE_HIERARCHY } from '@repo/schemas';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    // No @Roles() decorator — route is public after SessionGuard.
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.sessionUser;

    if (!user) throw new UnauthorizedException();

    const minimumLevel = Math.min(...requiredRoles.map((r) => ROLE_HIERARCHY[r]));

    if (ROLE_HIERARCHY[user.role] < minimumLevel) {
      throw new ForbiddenException('Insufficient role to access this resource.');
    }

    return true;
  }
}
