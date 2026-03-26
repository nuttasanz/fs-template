import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionCleanupService } from './session-cleanup.service';
import { SessionsRepository } from './sessions.repository';
import { UsersModule } from '../users/users.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [UsersModule, CommonModule],
  controllers: [AuthController],
  providers: [AuthService, SessionCleanupService, SessionsRepository],
})
export class AuthModule {}
