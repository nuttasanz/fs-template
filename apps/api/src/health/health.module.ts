import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

// DatabaseModule is @Global(), so DRIZZLE_CLIENT is injectable here without re-importing it.
@Module({ controllers: [HealthController] })
export class HealthModule {}
