import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [DatabaseModule, AuthModule, UsersModule, HealthModule],
  providers: [
    // Wrap all successful responses in { success: true, message, data }.
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // Apply audit logging globally to all mutation endpoints.
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
