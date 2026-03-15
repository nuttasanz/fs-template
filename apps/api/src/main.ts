import { resolve } from 'node:path';
import { config } from 'dotenv';
// Load .env from the monorepo root for local development.
// In production, env vars are injected by Docker Compose — config() is a no-op.
config({ path: resolve(__dirname, '../../../.env') });

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { loggerMiddleware } from './common/middleware/logger.middleware';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule); // ConfigModule validates env here

  // ── Security Headers ─────────────────────────────────────────────────────
  app.use(helmet()); // must be first — sets X-Content-Type-Options, CSP, X-Frame-Options, etc.

  // ── Versioning ───────────────────────────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── CORS ─────────────────────────────────────────────────────────────────
  // Wildcard is rejected: credentials (HttpOnly cookies) require explicit origins.
  const rawOrigins = process.env['ALLOWED_ORIGINS'] ?? '';
  if (rawOrigins === '*') {
    console.error('[Bootstrap] ALLOWED_ORIGINS cannot be "*" — incompatible with credentials (HttpOnly cookies).');
    process.exit(1);
  }
  const origins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: origins,
    credentials: true,                                           // required for the HttpOnly sid cookie
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
  });

  // ── Global Middleware ────────────────────────────────────────────────────
  app.use(loggerMiddleware);   // Logs: METHOD /path STATUS — Xms
  app.use(cookieParser());

  // ── Global Prefix & Filters ─────────────────────────────────────────────
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors (TransformInterceptor, AuditLogInterceptor) are
  // registered via APP_INTERCEPTOR in AppModule to support DI.

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Admin Backoffice API')
    .setDescription('Session-based admin API with RBAC and audit logging')
    .setVersion('1.0')
    .addCookieAuth('sid')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
