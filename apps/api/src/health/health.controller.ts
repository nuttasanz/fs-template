import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DrizzleHealthIndicator } from './drizzle-health.indicator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DrizzleHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check API and database health' })
  @ApiResponse({ status: 200, description: 'All systems operational.' })
  @ApiResponse({ status: 503, description: 'One or more services unavailable.' })
  check() {
    return this.health.check([() => this.db.isHealthy('database')]);
  }
}
