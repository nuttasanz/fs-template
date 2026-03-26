import { resolve } from 'node:path';
import { config } from 'dotenv';
// Load .env from the monorepo root for local development.
// In production, env vars are injected by Docker Compose — config() is a no-op.
config({ path: resolve(__dirname, '../../../.env') });

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap(): Promise<void> {
  // bufferLogs: true holds NestJS bootstrap messages in memory until app.useLogger()
  // is called, so all output is flushed through pino instead of the default logger.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger)); // redirect all NestJS logs through pino
  app.set('trust proxy', 1); // trust first hop (LB) — req.ip = real client IP from X-Forwarded-For

  // ── Graceful Shutdown ────────────────────────────────────────────────────
  // Allows onModuleDestroy / onApplicationShutdown hooks to run on SIGTERM/SIGINT,
  // ensuring in-flight requests complete and resources (DB pool, etc.) are released.
  app.enableShutdownHooks();

  // ── Security Headers ─────────────────────────────────────────────────────
  app.use(helmet()); // must be first — sets X-Content-Type-Options, CSP, X-Frame-Options, etc.

  // ── Versioning ───────────────────────────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── CORS ─────────────────────────────────────────────────────────────────
  // Wildcard is rejected: credentials (HttpOnly cookies) require explicit origins.
  const logger = app.get(Logger);
  const rawOrigins = process.env['ALLOWED_ORIGINS'] ?? '';
  if (rawOrigins === '*') {
    logger.error(
      'ALLOWED_ORIGINS cannot be "*" — incompatible with credentials (HttpOnly cookies).',
    );
    process.exit(1);
  }
  const origins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    credentials: true, // required for the HttpOnly sid cookie
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'X-Request-Id', 'X-Requested-With'], // allow callers to supply a trace ID
  });

  // ── Global Middleware ────────────────────────────────────────────────────
  // RequestIdMiddleware is registered via AppModule.configure() (NestModule).
  // pino-http (from LoggerModule) handles request logging — no manual logger middleware needed.
  app.use(cookieParser());

  // ── Global Prefix ───────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // Global filter (HttpExceptionFilter), interceptors (TransformInterceptor,
  // AuditLogInterceptor), and guards (ThrottlerGuard) are registered via
  // APP_FILTER / APP_INTERCEPTOR / APP_GUARD in AppModule to support DI.

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Admin Backoffice API')
    .setDescription('Session-based admin API with RBAC and audit logging')
    .setVersion('1.0')
    .addCookieAuth('sid')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
  logger.log(`API running on http://localhost:${port}/api`);
}

// ── Global process error handlers ────────────────────────────────────────────
// Safety net for unhandled async rejections and uncaught exceptions that escape
// the NestJS request lifecycle (e.g. fire-and-forget event emissions).
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
