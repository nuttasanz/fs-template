# Frontend Definition of Done

> Binary pass/fail checklist. Every frontend task must satisfy **all** items before merge.
> For qualitative code review depth, see `frontend.production-ready.md`.

## Architecture Constraints

- **Framework:** Next.js (App Router). Default to Server Components (RSC).
- **UI Library:** Mantine UI (primary). Tailwind CSS is **restricted** to macro-layouts only — do not mix Tailwind classes with Mantine components.
- **Data Fetching:** RSC `fetch` for reads + Next.js Server Actions for mutations.
- **Client Server-State:** TanStack Query is **restricted** to complex client-side needs only (polling, infinite scroll, optimistic updates, real-time sync). Do not use for basic CRUD.
- **Form Handling:** Mantine Form + `mantine-form-zod-resolver`.
- **Validation:** Zod — shared with Backend via `@repo/schemas` workspace package.
- **State Management:** Zustand for global client state only. Do NOT use for server state.

---

## 1. Code Quality & Static Analysis

- [ ] Code passes ESLint (`next/core-web-vitals`) / Prettier with **zero** warnings.
- [ ] TypeScript `strict` mode enabled. No `any` types, no `@ts-ignore` without documented justification.
- [ ] Components exceeding 200 lines must be evaluated for extraction. No deep nested ternaries (`a ? b : c ? d : e`).

## 2. Systemic Cohesion & Shared Contracts

- [ ] **Zero Shadow Types:** Frontend is FORBIDDEN from creating local DTOs/interfaces for API responses. All types must be imported from `@repo/schemas`.
- [ ] **Single Source of Truth:** Forms must use `zodResolver` with the exact same Zod schema used by the Backend validation pipe.
- [ ] **Shared Error Contract:** Frontend must parse and handle `ErrorResponseSchema` from `@repo/schemas`: `{ success: false, message: string, code: string, errors?: ErrorField[], timestamp?: string, path?: string }`. Map `errors[]` to form field validation. Display generic errors via Toast notifications.
- [ ] **UI Consistency:** Use only Mantine theme tokens for spacing, colors, and typography. Hardcoded hex colors or arbitrary pixel values are PROHIBITED.

## 3. Idiomatic React & Next.js

- [ ] **RSC First:** Default to Server Components. Use `"use client"` only at the lowest possible leaf node (e.g., buttons with `onClick`, forms).
- [ ] **Data Fetching:** Direct API calls inside `useEffect` are PROHIBITED. Fetch data in Server Components. Mutations must use Server Actions.
- [ ] **Memoization:** No premature optimization. Use `useMemo` / `useCallback` only when profiling proves a bottleneck or when passing props to heavily memoized children.

## 4. Performance, UX & Security

- [ ] **Loading States:** All async operations must have UI feedback (Skeleton, Spinner, or disabled button) to prevent CLS.
- [ ] **Error Handling:** Unhandled exceptions caught by Error Boundaries. API errors display user-friendly Toasts and are logged to a tracking system (e.g., Sentry). No raw stack traces in the UI.
- [ ] **XSS Prevention:** `dangerouslySetInnerHTML` is prohibited unless rendering explicitly sanitized content (via DOMPurify).
- [ ] **State Security:** Sensitive data (JWT tokens, PII) must NOT be stored in `localStorage` or `sessionStorage`. Use secure HttpOnly cookies.
- [ ] **Auth Flow Compliance:** Session cookies forwarded to Backend via Server Components or Server Actions only. Client Components must NEVER access session tokens directly. MFA and session refresh handled server-side (see `backend.dod.md` Architecture Constraints).

## 5. Documentation & Testing

- [ ] **Unit Testing:** Critical UI logic (permission-based rendering, complex form validations) must have Jest / React Testing Library coverage.
- [ ] **E2E Testing:** Critical user journeys spanning Frontend and Backend (e.g., Login → Dashboard → CRUD) should have at least one Playwright E2E test suite.
- [ ] **Storybook (Recommended):** Reusable UI components should be documented in Storybook.
