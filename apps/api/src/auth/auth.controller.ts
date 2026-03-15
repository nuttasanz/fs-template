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
import { ApiBody, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { LoginDTOSchema, type LoginDTO, type SessionDTO, type UserDTO } from '@repo/schemas';
import { AuthService } from './auth.service';
import { SessionGuard } from '../common/guards/session.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { SessionUser } from '../common/types/session.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
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
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
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
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const rawToken: string | undefined = req.cookies['sid'];
    if (!rawToken) throw new UnauthorizedException();
    await this.authService.logout(rawToken, res);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('sid')
  @ApiOperation({ summary: 'Return the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'The authenticated user.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  getMe(@CurrentUser() user: SessionUser): Promise<UserDTO> {
    return this.authService.getMe(user);
  }
}
