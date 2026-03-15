import { Controller, Get, HttpStatus, Inject } from '@nestjs/common';
import { Res } from '@nestjs/common';
import type { Response } from 'express';
import { sql } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../database/database.provider';
import type { DrizzleClient } from '../database/database.provider';

@Controller('health')
export class HealthController {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response): Promise<{ uptime: number; db: 'ok' | 'error' }> {
    let dbStatus: 'ok' | 'error' = 'ok';
    try {
      await this.db.execute(sql`SELECT 1`);
    } catch {
      dbStatus = 'error';
    }

    if (dbStatus === 'error') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return { uptime: process.uptime(), db: dbStatus };
  }
}
