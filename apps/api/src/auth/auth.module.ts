import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionGuard } from '../common/guards/session.guard';
import { SessionCleanupService } from './session-cleanup.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, SessionGuard, SessionCleanupService],
})
export class AuthModule {}
