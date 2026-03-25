# Frontend Code Review Guide

> **Qualitative** code review — defines _how deeply_ to evaluate code beyond the binary checklist.
> Verify `frontend.dod.md` compliance first, then apply this guide for deeper analysis.

## Objective

Review React/Next.js frontend code for production readiness. Prioritize rendering performance, state management correctness, component reusability, and security. Avoid over-engineering. Be direct — if the code is not production-ready, state why.

## Evaluation Pillars

### 1. Clarity & Maintainability

> Binary rules (200-line limit, no nested ternaries) → see `frontend.dod.md §1`

- **Component Design:** Is the component doing too much? Extract complex logic into Custom Hooks, or split into a Server Component (data/layout) + a smaller Client Component (interactivity). Avoid legacy "Smart/Dumb" container patterns.
- **Clarity over Cleverness:** Is the intent immediately obvious? Evaluate naming quality and code flow.
- **Readability:** Hooks ordered correctly (`useState` → `useRef` → `useEffect` → custom hooks)?
- **Prop Drilling:** Props passed down too many levels? Prefer **Component Composition** (`children` props) before reaching for Context or Zustand.
- **ISO/IEC 25010:** Evaluate against Usability, Maintainability, and Performance Efficiency quality characteristics.

### 2. Error Handling & Resilience

> Binary rules (Error Boundaries, Toast, Shared Error Contract) → see `frontend.dod.md §2, §4`

- **UX during Failure:** Beyond DoD compliance, evaluate the _quality_ of error UX. Are error messages actionable? Does the UI degrade gracefully (partial content) rather than full-page error?
- **Form Robustness:** Edge cases in user input handled? Form disabled during submission? Field-level errors from `ErrorResponseSchema` properly mapped to form fields?

### 3. Performance & Efficiency

- **Re-renders:** Obvious causes of unnecessary re-renders? (Inline object/function creation in props — flag only where it objectively matters.)
- **Next.js Optimization:** Misuse of `"use client"` at layout level forcing full client-side rendering? Images using `next/image`? Heavy Client Components lazy-loaded with `next/dynamic`?
- **Bundle Size:** Heavy or legacy libraries when native APIs or lighter alternatives exist? Massive barrel-file imports? Legacy libs (e.g., `moment`) instead of modern tree-shakable tools?

### 4. Security (OWASP for Frontend)

> Binary rules (XSS via dangerouslySetInnerHTML, state security) → see `frontend.dod.md §4`

- **Deep Scan:** Beyond `dangerouslySetInnerHTML` — unchecked `href` attributes (`javascript:...`), unsafe URL construction, unescaped user content in dynamic attributes.
- **Data Exposure:** Frontend code accidentally exposing sensitive variables or `.env` secrets (not prefixed with `NEXT_PUBLIC_`) to the browser bundle?

### 5. Next.js & React Idioms

> Binary rules (RSC First, no useEffect fetching, Zero Shadow Types) → see `frontend.dod.md §2, §3`

- **Rules of Hooks:** Hooks called conditionally or inside loops?
- **State Anti-patterns:** `useEffect` abused to sync state or listen to variable changes? This is a common anti-pattern — restructure as derived state or event handlers.
- **TanStack Query:** Only for complex client needs: polling, infinite scroll, optimistic updates, real-time sync. Basic CRUD fetching must use RSC `fetch`.
- **Next.js APIs:** Route handlers, middleware, and metadata APIs used correctly? No unnecessary client-side routing logic?

---

## Output Format

### 🚨 Critical Analysis

- List specific rendering issues, anti-patterns, UX flaws, or security risks. Reference the violated pillar number (1–5).
- State directly if the component structure is fundamentally flawed.

### 🛠 Before & After

- **Original Code:** the problematic snippet with file path.
- **Refactored Code:** the production-ready version. Show only changed lines. Demonstrate RSC separation, logic extraction, or composition patterns.

### 🧠 The 'Why'

- Cite a specific principle: React docs, Next.js App Router guidelines, Web Vitals (LCP, CLS, INP), or OWASP.
