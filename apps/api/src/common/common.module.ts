import { Module } from '@nestjs/common';
import { SessionGuard } from './guards/session.guard';
import { SessionsRepository } from '../auth/sessions.repository';

@Module({
  providers: [SessionGuard, SessionsRepository],
  exports: [SessionGuard, SessionsRepository],
})
export class CommonModule {}
