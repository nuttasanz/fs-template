import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DrizzleHealthIndicator } from './drizzle-health.indicator';

// DatabaseModule is @Global(), so DRIZZLE_CLIENT is injectable here without re-importing it.
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [DrizzleHealthIndicator],
})
export class HealthModule {}
