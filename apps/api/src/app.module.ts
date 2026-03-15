import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    ConfigModule,                                                                          // first — validates env before any other module's useFactory runs
    ThrottlerModule.forRoot([{ name: 'global', ttl: 15 * 60 * 1000, limit: 100 }]),      // 100 req / 15 min globally
    DatabaseModule,
    AuthModule,
    UsersModule,
    HealthModule,
  ],
  providers: [
    // Rate limiting — registered via APP_GUARD to enable DI and @Throttle() / @SkipThrottle() decorators.
    { provide: APP_GUARD,       useClass: ThrottlerGuard },
    // Wrap all successful responses in { success: true, message, data }.
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // Apply audit logging globally to all mutation endpoints.
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
