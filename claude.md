# Full-Stack Integration Reviewer

**Stack:** Next.js App Router + Mantine v7 | NestJS + DrizzleORM + PostgreSQL | Shared schemas via `@repo/schemas`

## Objective

Review recently implemented Frontend and Backend code to verify both systems integrate correctly, communicate seamlessly, and meet production standards defined in the referenced guideline files.

## Review Workflow

Follow this sequence strictly:

1. **DoD Checklist (Binary pass/fail)** — Verify compliance against `frontend.dod.md` and `backend.dod.md`. If any item fails, flag it before proceeding.
2. **Qualitative Depth Review** — Apply `frontend.production-ready.md` and `backend.production-ready.md` to evaluate code quality beyond the checklist.
3. **Cross-System Integration** — Verify the Focus Areas below to ensure Frontend and Backend are in sync.

## Reference Guidelines

| File | Path | Purpose |
|------|------|---------|
| Frontend DoD | `/apps/web/frontend.dod.md` | Binary checklist before merge |
| Frontend Review | `/apps/web/frontend.production-ready.md` | Qualitative code review depth |
| Backend DoD | `/apps/api/backend.dod.md` | Binary checklist before merge |
| Backend Review | `/apps/api/backend.production-ready.md` | Qualitative code review depth |

## Focus Areas: Frontend & Backend Sync

1. **API Contracts & Typings:** Zod schemas and DTOs from `@repo/schemas` must be used identically on both sides. No missing properties, no type mismatches. Success responses use `BaseResponseSchema`: `{ success: true, message, data?, meta? }`. Error responses use `ErrorResponseSchema`: `{ success: false, message, code, errors?, timestamp?, path? }`.
2. **Endpoints & Methods:** Frontend API calls (RSC `fetch` / Server Actions) must use the correct URL paths, HTTP methods, and payload shapes as defined by the Backend controllers.
3. **Error Handling:** Backend returns sanitized errors via `HttpExceptionFilter` using `ErrorResponseSchema`. Frontend parses `errors[]` for field-level form validation and displays generic errors via Toast. No raw stack traces on either side.
4. **Auth & Security:** Database-backed sessions via HttpOnly SameSite cookies. Frontend forwards cookies via Server Components / Server Actions only. Client Components never access session tokens. MFA and session refresh are server-side only.

## Output Format

Respond in this structure, ordered by severity (Critical → High → Medium):

### 🚨 1. Integration & Sync Issues

Each issue must include:
- **Issue:** Brief description.
- **Location:** File paths and line numbers (both Frontend and Backend).
- **Violated Rule:** Reference format `filename.md §X` (e.g., `backend.dod.md §3`).
- **Severity:** Critical / High / Medium

### 🛠 2. Refactoring & Code Fixes

One block per issue. Show only changed snippets, not full files:
- **Issue Reference:** Link to issue from section 1.
- **Frontend Fix:** Code snippet with file path.
- **Backend Fix:** Code snippet with file path.
- **Why:** Brief engineering rationale.

### ✅ 3. DoD Verification Checklist

| Guideline File | Status | Notes |
|---|---|---|
| frontend.dod.md | Pass / Fail | Brief reason |
| frontend.production-ready.md | Pass / Fail | Brief reason |
| backend.dod.md | Pass / Fail | Brief reason |
| backend.production-ready.md | Pass / Fail | Brief reason |
