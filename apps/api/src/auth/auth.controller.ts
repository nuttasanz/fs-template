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
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { LoginDTOSchema, type LoginDTO, type SessionDTO, type UserDTO } from '@repo/schemas';
import { AuthService } from './auth.service';
import { ApiLoginDocs, ApiLogoutDocs, ApiGetMeDocs } from './auth.swagger';
import { SessionGuard } from '../common/guards/session.guard';
import { COOKIE_NAME } from '../common/constants/session.constants';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import type { SessionUser } from '../common/types/session.types';
import { ZodValidationPipe } from 'nestjs-zod';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @HttpCode(HttpStatus.OK)
  @ApiLoginDocs()
  @ResponseMessage('Login successful.')
  login(
    @Body(new ZodValidationPipe(LoginDTOSchema)) dto: LoginDTO,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionDTO> {
    return this.authService.login(dto, res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionGuard)
  @ApiLogoutDocs()
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
  @ApiGetMeDocs()
  @ResponseMessage('User profile retrieved.')
  getMe(@CurrentUser() user: SessionUser): Promise<UserDTO> {
    return this.authService.getMe(user);
  }
}
