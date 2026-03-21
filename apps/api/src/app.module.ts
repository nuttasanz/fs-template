import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { AuditLogListener } from './common/listeners/audit-log.listener';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    ConfigModule, // first — validates env before any other module's useFactory runs
    LoggerModule.forRoot({
      pinoHttp: {
        // Re-use the ID stamped by RequestIdMiddleware so every log line carries the same ID.
        genReqId: (req) => req.headers['x-request-id'] as string,
        // Pretty output for local development; plain JSON in production (parsed by log aggregators).
        transport:
          process.env['NODE_ENV'] !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        autoLogging: true,
      },
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ name: 'global', ttl: 15 * 60 * 1000, limit: 100 }]), // 100 req / 15 min globally
    DatabaseModule,
    AuthModule,
    UsersModule,
    HealthModule,
  ],
  providers: [
    // Rate limiting — registered via APP_GUARD to enable DI and @Throttle() / @SkipThrottle() decorators.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Wrap all successful responses in { success: true, message, data }.
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // Apply audit logging globally to all mutation endpoints.
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    // Handles audit log events asynchronously (persists to DB outside request cycle).
    AuditLogListener,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Runs before pino-http so every request has an ID before logging occurs.
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
