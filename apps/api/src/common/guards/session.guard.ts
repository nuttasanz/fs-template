import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { COOKIE_NAME } from '../constants/session.constants';
import { SessionsRepository } from '../../auth/sessions.repository';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessionsRepo: SessionsRepository) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest<Request>();
    const rawToken: string | undefined = request.cookies[COOKIE_NAME];

    if (!rawToken) {
      throw new UnauthorizedException('No session token provided.');
    }

    const row = await this.sessionsRepo.findValidSession(rawToken);

    if (!row) {
      throw new UnauthorizedException('Session is invalid or has expired.');
    }

    request.sessionUser = { id: row.userId, email: row.email, role: row.role };
    return true;
  }
}
