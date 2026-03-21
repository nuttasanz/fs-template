# AI Agent Instruction: Production-Ready Admin Backoffice (Frontend Monorepo)

## 1. Context & Architecture
Build a professional-grade Admin Backoffice system using a Monorepo structure.
- **Framework:** Next.js (App Router)
- **UI Library:** Mantine UI (Primary). **Tailwind CSS is RESTRICTED** to macro-layouts only. Do not mix Tailwind classes with Mantine components to prevent style collisions.
- **Data Fetching Strategy:** Native RSC `fetch` (Read) + Next.js Server Actions (Mutations). 
- **Client Server-State:** TanStack Query (React Query) is RESTRICTED to complex client-side needs ONLY (e.g., polling, infinite scrolling, real-time sync). Do not use it for basic CRUD.
- **Form Handling:** React Hook Form + Zod Resolver
- **Validation:** Zod (Shared between Front/Back via `@repo/schemas` Monorepo workspace)
- **State Management:** Zustand (Only for global client state, DO NOT use for server state)

## 2. Standards & Principles (Strict Compliance)
- **ISO/IEC 25010:** Focus on Performance Efficiency, Usability, and Maintainability.
- **SOLID Principles:** Each service/module must have a single responsibility.
- **Component Architecture:** Strict separation between Server Components (RSC) and Client Components (`"use client"`).
- **The Elements of Programming Style:** "Clarity over Cleverness". Keep components small and focused. No excessive prop drilling.
- **Resilience:** Every page/module must have Error Boundaries and Suspense/Skeleton fallbacks.
- **Framework Idioms:** Adhere strictly to Next.js App Router best practices. Avoid React SPA legacy patterns.

## 3. Definition of Done (DoD): Production-Ready & System Cohesion
This document serves as a quality assurance checklist prior to merging or feature delivery. Every frontend task must satisfy the following minimum standard criteria:

## 1. Code Quality & Static Analysis (คุณภาพโค้ด)
- [ ] **Linting & Formatting:** Code must pass ESLint (Next.js core-web-vitals) / Prettier with ZERO warnings.
- [ ] **TypeScript Strictness:** Strict mode enabled. No `any`, no `@ts-ignore` without heavily documented justification.
- [ ] **Component Complexity:** Components exceeding 200 lines must be evaluated for extraction. Avoid deep nesting of conditional rendering (e.g., nested ternaries `a ? b : c ? d : e`).

## 2. Systemic Cohesion & Shared Contracts (ความสอดคล้องระดับระบบ)
- [ ] **Zero Shadow Types:** Frontend is FORBIDDEN from recreating local DTOs/Interfaces for API responses. All validation and API types MUST be imported from `@repo/schemas`.
- [ ] **Single Source of Truth:** Forms must use `zodResolver` with the exact same Zod schema used by the Backend validation pipe.
- [ ] **UI Consistency:** Use only Mantine UI theme tokens for spacing, colors, and typography. Hardcoded hex colors or arbitrary pixel values in UI components are PROHIBITED.

## 3. Idiomatic React & Next.js (มาตรฐานการเขียน React/Next.js)
- [ ] **RSC First:** Default to Server Components. Use `"use client"` ONLY at the lowest possible leaf node in the component tree (e.g., buttons with `onClick`, forms).
- [ ] **Data Fetching:** Direct API calls inside `useEffect` are PROHIBITED. Data must be fetched securely in Server Components. Mutations must use Server Actions. 
- [ ] **Memoization:** Do not prematurely optimize. Use `useMemo` and `useCallback` only when profiling shows a proven performance bottleneck or when passing props to heavily memoized child components.

## 4. Performance, UX & Security (ประสิทธิภาพและความปลอดภัย)
- [ ] **Loading States:** All async operations must have corresponding UI feedback (Skeleton loaders, Spinners, or disabled button states) to prevent layout shifts (CLS).
- [ ] **Error Handling & Observability:** Unhandled exceptions must be caught by Error Boundaries. API errors must display user-friendly Toast notifications, AND must be logged to a global tracking system (e.g., Sentry) for debugging. Raw stack traces must never leak to the UI.
- [ ] **XSS Prevention:** The use of `dangerouslySetInnerHTML` is strictly prohibited unless parsing explicitly sanitized markdown/HTML (using DOMPurify).
- [ ] **State Security:** Sensitive information (JWT tokens, PII) MUST NOT be stored in `localStorage` or `sessionStorage`. Rely on secure HttpOnly cookies managed via BFF or Next.js API routes.

## 5. Documentation & Testing
- [ ] **Unit Testing:** Critical UI logic (e.g., permission-based rendering, complex form validations) must have Jest/React Testing Library coverage.
- [ ] **Storybook (Optional but Recommended):** Reusable UI components should be documented in Storybook.