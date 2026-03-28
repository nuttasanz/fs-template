# Project Overrides for NestJS Best Practices

> This file documents where project-specific architectural decisions (defined in `backend.dod.md`
> and `backend.production-ready.md`) override or narrow the generic rules in this skill.
> Rules NOT listed here apply as-is.

## Overridden Rules

### security-auth-jwt → REPLACED by DB Sessions
- **Project decision:** Database-backed session management with HttpOnly SameSite cookies (`backend.dod.md` Architecture Constraints).
- **Why:** Revocability and MFA support are hard requirements. JWT is stateless and not trivially revokable.
- **What to do:** Ignore JWT-specific guidance (token expiry, refresh tokens, token invalidation). Apply session-equivalent patterns: session rotation, session revocation on password change, session cleanup on soft-delete.

### security-validate-all-input → NARROWED to Zod only
- **Project decision:** Zod via `@repo/schemas` + `ZodValidationPipe` (`backend.dod.md §2, §4`).
- **Why:** Zod schemas are shared with the Next.js frontend for single-source-of-truth validation. class-validator is class-based and cannot be shared.
- **What to do:** Apply the principle (validate all input) but use Zod pipes instead of class-validator decorators. Do not introduce `class-validator` or `class-transformer` dependencies.

### api-use-dto-serialization → REPLACED by Zod response serialization
- **Project decision:** Serialize responses using Zod schemas from `@repo/schemas` (`backend.dod.md §2`).
- **Why:** Maintains the Zero Shadow Types principle. class-transformer `@Exclude/@Expose` would create a parallel type system.
- **What to do:** Do not use `ClassSerializerInterceptor` or class-transformer decorators. Response shaping happens via Zod `.parse()` or typed response construction matching `BaseResponseSchema`.

### arch-use-repository-pattern → ADOPTED as mandatory standard
- **Project decision:** Every module must have `*.repository.ts`. Services never call DrizzleORM directly (`backend.dod.md §2`).
- **Why:** Standardization, uniform testability, transaction composition via `tx?` parameter.
- **What to do:** Follow the skill's recommendation, but use DrizzleORM (not TypeORM). All methods accept optional `tx?: DrizzleTransaction`. Reference existing pattern: `apps/api/src/users/users.repository.ts`.

### arch-use-events → NARROWED to audit logging only
- **Project decision:** `@nestjs/event-emitter` used exclusively for async audit events on critical mutations (`backend.dod.md §4`).
- **Why:** Prevents over-application of event-driven patterns. Direct service calls preferred for module communication in this monolith.
- **What to do:** Do not use events for general inter-module communication. Only emit events for audit logging of role changes, financial transactions, and security settings.

### di-interface-segregation, di-liskov-substitution, di-use-interfaces-tokens → APPLY WITH RESTRAINT
- **Project decision:** KISS principle (`backend.production-ready.md` Pillar 5).
- **Why:** Advanced OOP patterns add ceremony without proportional benefit for CRUD-centric DrizzleORM + Zod architecture.
- **What to do:** Apply when there is a concrete need (e.g., swapping implementations for testing). Do not introduce abstract classes or Symbol tokens for services that have a single implementation.

### micro-* (all microservice rules) → NOT APPLICABLE
- **Project decision:** Monorepo monolith architecture.
- **What to do:** Ignore the entire Microservices category. If the project moves to microservices in the future, re-evaluate.

## Rules That Apply As-Is

All other rules apply without modification, particularly:
- `arch-avoid-circular-deps` (CRITICAL)
- `arch-feature-modules` (CRITICAL)
- `arch-single-responsibility` (CRITICAL)
- `di-prefer-constructor-injection` (CRITICAL)
- `di-scope-awareness` (CRITICAL)
- `error-use-exception-filters` (HIGH)
- `error-handle-async-errors` (HIGH)
- `security-use-guards` (HIGH)
- `security-rate-limiting` (HIGH)
- `security-sanitize-output` (HIGH)
- `perf-*` (all performance rules)
- `test-*` (all testing rules)
- `db-use-transactions` (HIGH)
- `db-avoid-n-plus-one` (HIGH)
- `db-use-migrations` (HIGH)
- `api-use-interceptors` (MEDIUM)
- `api-use-pipes` (MEDIUM — use Zod pipes, not class-validator)
- `devops-*` (all DevOps rules)
