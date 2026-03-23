import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { LoginDTOSchema, type LoginDTO, type SessionDTO, type UserDTO } from '@repo/schemas';
import { AuthService } from './auth.service';
import { SessionGuard } from '../common/guards/session.guard';
import { COOKIE_NAME } from '../common/constants/session.constants';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { swaggerErrorSchema } from '../common/swagger/error-schema.swagger';
import type { SessionUser } from '../common/types/session.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ auth: {} })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Login successful.')
  @ApiOperation({ summary: 'Authenticate and receive a session cookie' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'admin@example.com' },
        password: { type: 'string', minLength: 12, example: 'SuperSecret123!' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful. Sets HttpOnly sid cookie.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed.',
    schema: swaggerErrorSchema('VALIDATION_FAILED', '/api/v1/auth/login'),
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials.',
    schema: swaggerErrorSchema('AUTH_UNAUTHORIZED', '/api/v1/auth/login'),
  })
  @ApiResponse({
    status: 429,
    description: 'Too many login attempts.',
    schema: swaggerErrorSchema('BAD_REQUEST', '/api/v1/auth/login'),
  })
  login(
    @Body(new ZodValidationPipe(LoginDTOSchema)) dto: LoginDTO,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionDTO> {
    return this.authService.login(dto, res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionGuard)
  @ApiCookieAuth('sid')
  @ApiOperation({ summary: 'Invalidate the current session and clear the cookie' })
  @ApiResponse({ status: 204, description: 'Logged out successfully.' })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated.',
    schema: swaggerErrorSchema('AUTH_UNAUTHORIZED', '/api/v1/auth/logout'),
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: SessionUser,
  ): Promise<void> {
    const rawToken: string | undefined = req.cookies[COOKIE_NAME];
    if (!rawToken) throw new UnauthorizedException();
    await this.authService.logout(rawToken, res, user.id);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  @ResponseMessage('User profile retrieved.')
  @ApiCookieAuth('sid')
  @ApiOperation({ summary: 'Return the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'The authenticated user.' })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated.',
    schema: swaggerErrorSchema('AUTH_UNAUTHORIZED', '/api/v1/auth/me'),
  })
  getMe(@CurrentUser() user: SessionUser): Promise<UserDTO> {
    return this.authService.getMe(user);
  }
}
