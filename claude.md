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

## 3. Database Schema (DrizzleORM)
Define the following core entities:
- **users:** id, email, password_hash, role (Enum: SUPER_ADMIN, ADMIN, USER), status, created_at, updated_at, deleted_at.
- **profiles:** id, user_id, first_name, last_name, bio.
- **audit_logs:** id, actor_id, action (string), target_id, entity_name, changes (jsonb), ip_address, timestamp.
- **sessions:** id, user_id, token, expires_at.

## 4. Key Logic & RBAC Rules
Implement the following logic in the Backend Service Layer:
- **Authentication:** - No public registration. 
    - Admin/Super Admin can create users. 
    - First Super Admin must be initialized via CLI/Seed.
- **Authorization (RBAC):**
    - `USER`: Read-only access to their own data.
    - `ADMIN`: 
        - Can Read/Update/Delete `USER` roles.
        - **CANNOT** Create/Update/Delete other `ADMIN` or `SUPER_ADMIN` roles. (Logic check: `target.role >= actor.role` must be denied).
    - `SUPER_ADMIN`: Full access to all roles and system settings.
- **Soft Delete:** All `DELETE` operations must only update `deleted_at`.

## 5. Implementation Tasks

### Phase 1: Shared Workspace
- Setup Zod schemas for `UserDTO`, `LoginDTO`, `CreateUserDTO`.
- Ensure these schemas are usable by both NestJS (for validation) and Next.js (for form handling).

### Phase 2: Backend (NestJS)
- Implement `AuthModule` using Session-based logic.
- Implement `RBACGuard` that checks hierarchy (Super Admin > Admin > User).
- Implement `AuditLogInterceptor` to automatically record all `POST`, `PATCH`, `DELETE` requests.
- CRUD for User Management with proper pagination and Drizzle filters.

### Phase 3: Frontend (Next.js + Mantine)
- Implement a Responsive Layout with Sidebar.
- Login Page (Form validation via Zod).
- User Management Table:
    - Server-side Pagination.
    - Action buttons (Edit/Delete) visibility based on actor's role.
    - Modal forms for Create/Edit User.

## 6. Definition of Done (DoD)
- Code must pass ESLint/Prettier.
- All API endpoints must have Swagger (OpenAPI) documentation.
- Error handling must return consistent JSON format (e.g., `{ success: false, message: string, errors: [] }`).
- Logic for "Admin cannot touch Admin" must be unit tested.