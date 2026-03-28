# Project Overrides for Next.js Best Practices

> This file documents where project-specific architectural decisions (defined in `frontend.dod.md`
> and `frontend.production-ready.md`) override or narrow the generic rules in this skill.
> Rules NOT listed here apply as-is.

## Overridden Rules

### route-handlers.md → PROHIBITED for API logic
- **Project decision:** NestJS is the exclusive API backend. All data fetching targets the NestJS API.
- **Why:** Using Next.js route handlers for API logic would create a split API surface, duplicating auth/validation/error handling across two backends.
- **What to do:** Route handlers may ONLY be used for Next.js-internal concerns (e.g., revalidation webhooks, image proxy). Never for business logic or data mutation.

### directives.md `'use cache'` → USE WITH CAUTION
- **Project decision:** Database-backed sessions with user-specific data (`backend.dod.md` Architecture Constraints).
- **Why:** Caching server component output that contains session-specific or user-specific data could serve the wrong user's data.
- **What to do:** Never apply `'use cache'` to components that read session cookies or display user-specific content. Safe for: static content, public pages, shared layouts without auth state.

### data-patterns.md → CONSTRAINED by frontend.dod.md §3
- **Project decision:** RSC `fetch` for reads, Server Actions for mutations. TanStack Query restricted to complex client needs only (polling, infinite scroll, optimistic updates, real-time sync). No `useEffect` data fetching (`frontend.dod.md §3`).
- **What to do:** Follow the skill's data patterns but enforce the project's TanStack Query restriction. Default to RSC fetch + Server Actions. Only introduce TanStack Query when the use case objectively requires it.

### error-handling.md → EXTENDED by Shared Error Contract
- **Project decision:** Frontend must parse `ErrorResponseSchema` from `@repo/schemas` (`frontend.dod.md §2`).
- **What to do:** Apply the skill's `error.tsx` / `global-error.tsx` patterns AND map `ErrorResponseSchema.errors[]` to form field validation. Display generic errors via Mantine Toast notifications. Reference: `packages/schemas/src/response.schema.ts` for `ErrorResponseSchema`, `ErrorCode`, `ErrorFieldSchema`.

## Narrowing Notes

### UI Library Constraint
- **Project decision:** Mantine v7 primary. Tailwind restricted to macro-layouts only (`frontend.dod.md` Architecture Constraints).
- **What to do:** When the skill suggests Tailwind-based patterns, translate to Mantine equivalents. Use Mantine theme tokens for spacing, colors, typography.

### State Management Constraint
- **Project decision:** Zustand for global client state only. No Zustand for server state (`frontend.dod.md` Architecture Constraints).
- **What to do:** When the skill suggests client-side state patterns, verify they align with Zustand-only policy.

### Form Handling Constraint
- **Project decision:** Mantine Form + `mantine-form-zod-resolver` with shared Zod schemas (`frontend.dod.md` Architecture Constraints, §2).
- **What to do:** Do not introduce React Hook Form, Formik, or other form libraries.

## Rules That Apply As-Is

All other rules apply without modification, particularly:
- `file-conventions.md` — project structure
- `rsc-boundaries.md` — RSC/Client boundary rules
- `async-patterns.md` — Next.js 15+ async APIs
- `runtime-selection.md` — default Node.js runtime
- `functions.md` — hooks and server functions
- `metadata.md` — SEO and OG images
- `image.md` — `next/image` optimization
- `font.md` — `next/font` optimization
- `bundling.md` — bundle optimization
- `scripts.md` — `next/script` usage
- `hydration-error.md` — hydration debugging
- `suspense-boundaries.md` — Suspense requirements
- `parallel-routes.md` — parallel/intercepting routes
- `self-hosting.md` — Docker/standalone deployment
- `debug-tricks.md` — MCP debugging
