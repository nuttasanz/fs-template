# Backend Code Review Guide

> **Qualitative** code review — defines _how deeply_ to evaluate code beyond the binary checklist.
> Verify `backend.dod.md` compliance first, then apply this guide for deeper analysis.

## Objective

Review NestJS backend code for production readiness. Prioritize system stability, performance, security, and maintainability. Recommend the simplest effective solution (KISS). Be direct — if the code is not production-ready, state why.

## Evaluation Pillars

### 1. Clarity & Maintainability

> Binary rules (linting, TypeScript strict, no `any`) → see `backend.dod.md §1`

- **Readability:** Is the intent immediately obvious? Evaluate naming quality and code flow.
- **Anti-patterns:** Magic numbers, arrowhead code (deep nesting), or "clever" one-liners that obscure logic.
- **Single Responsibility:** Does each function/service do exactly one thing? Are variable and function names descriptive?
- **ISO/IEC 25010:** Evaluate against Functional Suitability, Security, and Maintainability quality characteristics.

### 2. Error Handling & Resilience

> Binary rules (HttpExceptionFilter, no stack trace leaks, sanitized error format) → see `backend.dod.md §3`

- **Failure Coverage:** Beyond DoD compliance, evaluate coverage of unhappy paths. Are database timeouts, 3rd-party API failures, and race conditions explicitly handled?
- **Observability:** Sufficient structured logging for production debugging? No silent failures, but no sensitive PII in logs either.

### 3. Performance & Efficiency

- **Database:** N+1 queries, missing indexes, unoptimized aggregations. DrizzleORM-specific: verify `.select()` uses explicit column lists for large tables; use `.leftJoin()` instead of separate queries where appropriate.
- **Resource Management:** Memory leaks, blocking event-loop operations, or inefficient algorithms (e.g., O(n²) where O(n) or O(n log n) is achievable).

### 4. Security (OWASP API Security Top 10)

> Binary rules (ZodValidationPipe, rate limiting, RBAC) → see `backend.dod.md §4`

- **Deep Scan:** Beyond input validation — SQL injection, Broken Access Control / IDOR, SSRF, mass assignment.
- **Authorization Logic:** RBAC hierarchy enforced at _both_ guard and service layers? Any bypass paths?

### 5. NestJS Idioms & Pragmatism

> Binary rules (Zero Shadow Types, Data Encapsulation, shared schemas) → see `backend.dod.md §2`

- **Framework Patterns:** Modules, DI, Guards, Interceptors, Pipes used correctly? No circular dependencies, no service logic in controllers.
- **No Over-Engineering:** No unnecessary abstractions. Do not suggest CQRS, Event Sourcing, or massive interfaces for simple CRUD unless structurally required.
- **Soft Deletes:** Applied correctly per `backend.dod.md` Architecture Constraints? Required for users and critical business data; must NOT be used for junction tables or ephemeral data.
- **Targeted Auditability:** Only critical business mutations (role changes, financial transactions, security settings) should be audited. Avoid logging trivial changes to prevent database bloat.

---

## Output Format

### 🚨 Critical Analysis

- List specific issues, technical debt, or security risks. Reference the violated pillar number (1–5).
- Be direct: if the code is not fit for production, state why.

### 🛠 Before & After

- **Original Code:** the problematic snippet with file path.
- **Refactored Code:** the production-ready version. Show only changed lines. Focus on simplicity and performance.

### 🧠 The 'Why'

- Cite a specific principle: Clean Code, SOLID, OWASP API Security, NestJS docs, or database optimization best practice.
