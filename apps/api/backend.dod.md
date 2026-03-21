# AI Agent Instruction: Production-Ready Admin Backoffice (Monorepo)

## 1. Context & Architecture

Build a professional-grade Admin Backoffice system using a Monorepo structure.

- **Frontend:** Next.js (App Router), Mantine UI, TanStack Query.
- **Backend:** NestJS, PostgreSQL.
- **ORM:** DrizzleORM.
- **Validation:** Zod (Shared between Front/Back via Monorepo workspace).
- **Auth Strategy:** Database-backed Session management (for revokable sessions) with MFA support.

## 2. Standards & Principles (Strict Compliance)

- **ISO/IEC 25010:** Focus on Functional Suitability, Security, and Maintainability.
- **SOLID Principles:** Each service/module must have a single responsibility.
- **The Elements of Programming Style:** "Clarity over Cleverness". Code must be readable, no magic numbers, no deep nesting.
- **Auditability:** Every mutation (C/U/D) must be logged in an `audit_logs` table.
- **Data Integrity:** Use Soft Deletes for users and critical data.

## 3. Definition of Done (DoD): Production-Ready & System Cohesion

This document serves as a quality assurance checklist prior to merging or feature delivery. Every task must satisfy the following minimum standard criteria:

## 1. Code Quality & Static Analysis (คุณภาพโค้ด)

- [ ] **Linting & Formatting:** Code must pass ESLint/Prettier with ZERO warnings
- [ ] **TypeScript Strictness:** TypeScript 'strict' mode must be enabled and pass without any 'any' types.
- [ ] **Clarity over Cleverness:** Code must be immediately readable and maintainable. Avoid "clever" or overly complex logic that hinders peer comprehension.

## 2. Systemic Cohesion & Shared Contracts (ความสอดคล้องระดับระบบ)

- [ ] **Zero Shadow Types:** Local types or interfaces that mirror shared schemas are FORBIDDEN. All DTOs and Validation logic must be imported from @fs/schemas.
- [ ] **Single Source of Truth:** Data validation (Zod) for both frontend and backend must utilize the exact same schemas from the Shared Package.
- [ ] **Logic Synchronization:** Business-critical logic (e.g., Role Hierarchy: SUPER_ADMIN > ADMIN > USER) must be defined in a single location and shared globally. Hardcoding logic in multiple places is prohibited.

## 3. Standardized API Contract (มาตรฐานการสื่อสาร)

- [ ] **Success Responses:** All successful API responses must be wrapped via TransformInterceptor into the format: { success: true, message: string, data: T, meta?: any }.
- [ ] **Error Handling:** All errors must pass through HttpExceptionFilter returning the format: { success: false, message: string, code: string, errors?: { field: string, message: string }[], timestamp: string, path: string }.
- [ ] **No Internal Leaks:** Database errors or stack traces must never reach the client in non-development environments.

## 4. Security & Reliability Hardening

- [ ] **Input Validation:** All endpoints must use ZodValidationPipe to enforce strict input sanitization.
- [ ] **Rate Limiting:** Auth and sensitive endpoints must have active rate limits.
- [ ] **Auditability:** All mutation operations (POST/PATCH/DELETE) must trigger an Audit Log entry.
- [ ] **Transaction Safety:** Any service method involving multiple table updates must be wrapped in a Database Transaction.
- [ ] **RBAC Hierarchy:** 'Target-based' authorization logic (e.g., Admins are prohibited from modifying other Admins) must be strictly enforced at both the API Guard and Service Layer.

## 5. Documentation & Testing

- [ ] **Swagger (OpenAPI):** All Endpoints, DTOs, and Error Codes must be fully documented and reflected in the Swagger UI (/api/docs).
- [ ] **Unit Testing:** Critical business logic, specifically RBAC permission checks, must achieve 100% Test Coverage.
- [ ] **Integration Testing:** Core system workflows (e.g., Login -> Create User -> Verify Audit Log) must pass at least one complete integration test suite.
