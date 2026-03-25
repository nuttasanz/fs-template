# Backend Definition of Done

> Binary pass/fail checklist. Every backend task must satisfy **all** items before merge.
> For qualitative code review depth, see `backend.production-ready.md`.

## Architecture Constraints

- **Stack:** NestJS, PostgreSQL, DrizzleORM.
- **Validation:** Zod — shared with Frontend via `@repo/schemas` workspace package.
- **Auth Strategy:** Database-backed session management (revokable) with MFA support.
- **Auth Flow:** Session ID stored in a secure HttpOnly SameSite cookie. Frontend (Next.js) forwards this cookie on every request via Server Components or Server Actions. Session refresh/rotation and MFA challenge flows are handled server-side — the client never accesses the session token directly.
- **Soft Deletes:** Required for users and critical business data. Do NOT use for junction tables or ephemeral data.

---

## 1. Code Quality & Static Analysis

- [ ] Code passes ESLint / Prettier with **zero** warnings.
- [ ] TypeScript `strict` mode enabled. No `any` types, no `@ts-ignore` without documented justification.
- [ ] Code is immediately readable. No magic numbers, no deep nesting, no "clever" one-liners that obscure intent.

## 2. Systemic Cohesion & Shared Contracts

- [ ] **Zero Shadow Types:** Local types mirroring shared schemas are FORBIDDEN. All DTOs and validation logic must be imported from `@repo/schemas`.
- [ ] **Data Encapsulation:** DrizzleORM schemas/types must NOT leak to the API response. Serialize responses using Zod schemas from `@repo/schemas`.
- [ ] **Single Source of Truth:** Frontend and Backend must use the exact same Zod schemas from `@repo/schemas` for validation.
- [ ] **Logic Synchronization:** Business-critical logic (e.g., Role Hierarchy: `SUPER_ADMIN > ADMIN > USER`) must be defined once in `@repo/schemas` and shared globally. No hardcoded duplicates.

## 3. Standardized API Contract

- [ ] **Success Responses:** Use standard HTTP status codes (200, 201). Response envelope: `{ success: true, message: string, data?: T, meta?: PaginatedMeta }`. Bypass formatting for webhooks, streams, or raw buffer endpoints.
- [ ] **Error Responses:** All errors pass through a global `HttpExceptionFilter` returning the `ErrorResponseSchema` format: `{ success: false, message: string, code: string, errors?: ErrorField[], timestamp?: string, path?: string }`. Import `ErrorResponseSchema` from `@repo/schemas`.
- [ ] **No Internal Leaks:** Database errors (e.g., Postgres constraints) or stack traces must NEVER reach the client in non-development environments. Map them to generic HTTP 400/500 errors.

## 4. Security & Reliability Hardening

- [ ] **Input Validation:** All endpoints must use `ZodValidationPipe` for strict input sanitization.
- [ ] **Rate Limiting:** Auth and sensitive endpoints must have active rate limits.
- [ ] **Asynchronous Audit:** Critical business mutations (role changes, financial transactions, security settings) must emit async audit events via `@nestjs/event-emitter`. Do not audit trivial data changes. Do not block the HTTP response cycle.
- [ ] **Transaction Safety:** Service methods involving multiple table updates must be wrapped in a Drizzle database transaction.
- [ ] **RBAC Hierarchy:** Target-based authorization (e.g., Admins cannot modify other Admins) must be enforced at both the Guard and Service layers.

## 5. Documentation & Testing

- [ ] **Swagger (OpenAPI):** All endpoints, DTOs, and error codes must be documented and visible in Swagger UI (`/api/docs`).
- [ ] **Unit Testing:** RBAC permission checks must achieve 100% test coverage.
- [ ] **Integration Testing:** Core workflows (e.g., Login → Create User) must have at least one complete integration test suite.
- [ ] **E2E Testing:** Critical user journeys spanning Frontend and Backend (e.g., Login → Dashboard → CRUD) should have at least one Playwright E2E test suite.
