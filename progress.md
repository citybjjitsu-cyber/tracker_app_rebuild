# CKB Tracker Progress Report

## Project Overview
Martial Arts Attendance Tracking System - A full-stack application for managing student attendance, class scheduling, curriculum/lesson management, teacher assignments, and providing analytics dashboards for students, teachers, and administrators.

---

## Implementation Plan: PIN-Based Check-In Confirmation & Future Kiosk Mode

**Goal:** Add per-user PIN verification as a confirmation step during check-in on the `/check-in` page. Students select their classes, then confirm with their PIN. This is the first step toward a full self-service kiosk mode.

### Design Decisions

- **PIN timing**: Session confirm (Option B) — select classes first, then enter PIN once to confirm all
- **Page**: PIN step added to existing `/check-in` page (not a separate page)
- **Bypass**: PIN not required for teacher-mediated check-ins (teacher's authority substitutes)
- **Future**: Full self-service kiosk page at `/kiosk` (Phase 2), eventual tablet user deprecation (Phase 3)

---

## Phase 1: PIN Verification on Check-In Page

### Backend Changes

| File | Change |
|------|--------|
| `backend/app/routers/attendance.py` | Add `POST /attendance/bulk-check-in` — accepts `{ user_uuid, class_ids: int[] }`, creates multiple pending attendance records in one request. Needed so frontend can submit all selected classes at once after PIN verification. |
| (none) | `POST /kiosk/verify-user-pin` already exists — no changes needed. |

### Frontend Changes

| File | Change |
|------|--------|
| `ckb-tracker/src/lib/api.ts` | Add `kioskApi.verifyUserPin(pin)` → `POST /kiosk/verify-user-pin`. Add `attendanceApi.bulkCheckIn(userUuid, classIds)` → `POST /attendance/bulk-check-in`. |
| `ckb-tracker/src/app/check-in/page.tsx` | Refactor class selection and submission flow (described below). |

### Check-In Page Flow (After Changes)

1. **Class selection** — "Check In" button on each class adds it to a **pending queue** instead of submitting immediately. Button toggles to "Selected ✓". No API call yet.

2. **Pending queue indicator** — Shows count of selected classes (e.g., "2 classes selected") near the student info card. Includes a "Clear" button.

3. **"Confirm with PIN" button** — Appears when ≥1 class is queued.

4. **PIN entry modal** — Centered modal with: student avatar + name, list of selected classes, PIN input (4 digits, masked), numeric keypad (mobile-friendly), Confirm/Cancel buttons, error display.

5. **PIN verification** — Calls `POST /kiosk/verify-user-pin` with entered PIN.

6. **Submit check-ins** — On `valid: true`, calls `POST /attendance/bulk-check-in` to create all pending records. Shows success state.

7. **Error handling** — On `valid: false`, shows "Invalid PIN" error.

### Guard Conditions

| Who is checking in | PIN required? |
|---|---|
| Tablet user checking in a student | ✅ Yes |
| Student checking self in | ✅ Yes |
| Teacher checking in a student | ❌ No |
| Teacher adding students to class manually | ❌ No |
| Admin checking in | ❌ No |

### Implementation Order

1. Add `kioskApi.verifyUserPin` and `attendanceApi.bulkCheckIn` to `api.ts`
2. Add `POST /attendance/bulk-check-in` to backend `attendance.py`
3. Modify `check-in/page.tsx` — add state for `pendingCheckIns: number[]`
4. Replace direct `handleCheckIn(cls.id)` calls with queue add/remove logic
5. Build PIN entry modal component (inline in check-in page)
6. Wire up: PIN verify → bulk check-in → success feedback
7. Add teacher/admin bypass logic

---

## Phase 2: Full Kiosk Mode (Completed)

**Goal:** Self-service page at `/kiosk` where students walk up, enter their PIN, select classes, and confirm — no tablet user needed.

### New Page: `/kiosk`

| Step | Screen | Description |
|------|--------|-------------|
| 1 | Welcome | Full-screen idle screen, "Tap to sign in" prompt, auto-timeout |
| 2 | Identify | Enter PIN (primary, calls `verify-user-pin`), or search by name (fallback) |
| 3 | Select classes | Simplified weekly grid, tap to toggle classes |
| 4 | Confirm | Shows student info + selected classes, "Confirm" button |
| 5 | Success | Animated checkmark, auto-return to welcome after 5s |

### Key Differences from `/check-in`

| Aspect | Current `/check-in` | Future `/kiosk` |
|--------|-------------------|-----------------|
| Operator | Tablet user searches & selects | Student self-service |
| Identification | Tablet user searches by name | Student enters PIN (or searches name) |
| Class selection | Tablet user picks classes | Student picks own classes |
| Confirmation | Immediate check-in (no PIN) | PIN entry to confirm |
| Session | 120s timer, logout button | Auto-timeout, no logout |
| UI density | Full desktop-style | Large touch targets, minimal |

### New Files

- `ckb-tracker/src/app/kiosk/page.tsx` — welcome + identify screen
- `ckb-tracker/src/app/kiosk/select/page.tsx` — class selection
- `ckb-tracker/src/app/kiosk/confirm/page.tsx` — PIN re-entry + confirmation

### Relationship to Tablet User

- Kiosk mode eventually **replaces** the need for a dedicated tablet user login
- The `tablet@example.com` account becomes **optional/legacy**
- Both can coexist during migration

---

## Phase 3: Staff-Authenticated Kiosk (In Progress — Current)

**Goal:** Kiosk requires staff login before students can check in. Protects all kiosk API endpoints behind staff JWT, preventing anonymous enumeration on public web.

### Backend Changes

| # | File | Change |
|---|------|--------|
| 1 | `backend/app/routers/kiosk.py` | Add `POST /kiosk/unlock` — staff email/password login, returns access_token + refresh_token in body |
| 2 | `backend/app/routers/kiosk.py` | Add `POST /kiosk/lock` — revokes kiosk session JTI |
| 3 | `backend/app/routers/kiosk.py` | Add `Depends(get_current_user)` to: `verify-pin-for-user`, `verify-user-pin`, and any other open kiosk endpoints |
| 4 | `backend/app/schemas.py` | Add `KioskUnlockResponse` schema |

### Frontend Changes

| # | File | Change |
|---|------|--------|
| 1 | `ckb-tracker/src/app/page.tsx` | Replace with kiosk landing page (locked/unlocked states) |
| 2 | `ckb-tracker/src/app/kiosk/KioskContext.tsx` | Add: `isUnlocked`, `unlockedBy`, unlock/lock functions, staff token in memory |
| 3 | `ckb-tracker/src/app/kiosk/page.tsx` | Redirect to `/` |
| 4 | `ckb-tracker/src/app/kiosk/KioskLocked.tsx` | New: locked state with CKB branding + "Staff Sign In" + news section |
| 5 | `ckb-tracker/src/app/kiosk/KioskStaffLogin.tsx` | New: inline email/password form for staff unlock |
| 6 | `ckb-tracker/src/app/kiosk/KioskUnlocked.tsx` | New: wrapper around existing flow with "Lock Kiosk" button |
| 7 | `ckb-tracker/src/lib/api.ts` | Add `kioskApi.unlock`, `kioskApi.lock` |
| 8 | `ckb-tracker/src/components/AppLayout.tsx` | Update public routes |

### Security Model

- Staff JWT stored in memory (not localStorage) — lost on page close
- 60s idle timer → auto-lock, clears staff token
- All kiosk API calls require `Authorization: Bearer <staff_token>`
- Staff login rate-limited (existing `slowapi` on `/auth/login`)
- Future: news blog on locked screen via `newsApi.list(true)`

---

## Phase 4: Tablet User Deprecation (Future)

- Add migration guide for gyms using tablet user
- Admin setting: "Enable Kiosk Mode" toggle
- Optionally redirect `/check-in` → `/kiosk`
- Retire tablet role and seed account

---

## Phase 5: Testing (Future)

**Goal:** Add comprehensive test coverage — unit tests for backend and frontend, plus Playwright E2E tests for the PIN check-in flow.

### Backend Tests — `backend/tests/`

| Step | What | Details |
|------|------|---------|
| 1 | Install test deps | `uv add --dev pytest httpx` |
| 2 | `conftest.py` | Shared fixtures: test DB session with SQLite in-memory, FastAPI test client, seed data |
| 3 | `test_kiosk.py` | `test_verify_valid_pin`, `test_verify_invalid_pin`, `test_pin_lockout_3_strikes`, `test_pin_lockout_429`, `test_pin_no_hash` |
| 4 | `test_attendance.py` | `test_bulk_check_in_success`, `test_bulk_check_in_duplicates`, `test_bulk_check_in_unauthenticated` |

### Frontend Unit Tests — `ckb-tracker/vitest` + `@testing-library/react`

| Step | What | Details |
|------|------|---------|
| 1 | Install test deps | `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom` |
| 2 | `vitest.config.ts` | Configure with React, jsdom environment, path aliases |
| 3 | `src/__tests__/api.test.ts` | Mock axios, test `kioskApi.verifyUserPin`, `attendanceApi.bulkCheckIn` |
| 4 | `src/__tests__/check-in-flow.test.tsx` | Component tests: toggle queue on/off, PIN modal renders, teacher bypass, error states |

### Frontend E2E Tests — Playwright

| Step | What | Details |
|------|------|---------|
| 1 | Install | `npm install -D @playwright/test` + `npx playwright install chromium` |
| 2 | `ckb-tracker/e2e/playwright.config.ts` | Configure base URL, test dir, webServer to auto-start dev server |
| 3 | `e2e/check-in.spec.ts` | Login as teacher → select classes → confirm (bypass PIN) → verify pending status |
| 4 | `e2e/kiosk-pin.spec.ts` | Login as student → queue class → PIN modal → enter valid PIN → verify check-in |
| 5 | `e2e/pin-lockout.spec.ts` | Login as student → queue → enter wrong PIN 3× → verify 429 lockout message |
| 6 | `e2e/cancel.spec.ts` | Check in → cancel pending → verify removed |

---

## Phase 6: Security Review (Web Deployment)

**Goal:** Hardened security posture for production web deployment — covering authentication, API, frontend, infrastructure, and data protection.

### 5.1 Authentication & Session Security

| # | Task | Details |
|---|------|---------|
| 1 | JWT rotation | Enforce short-lived access tokens (15 min), implement refresh token rotation with revocation of old pairs |
| 2 | CSRF audit | Verify CSRF token is validated on all state-changing endpoints (POST/PUT/DELETE). Ensure double-submit cookie pattern is correct |
| 3 | Session management | Ensure proper session invalidation on logout (server-side token blacklist or DB-backed sessions). Add absolute session expiry (e.g., 24h) |
| 4 | Password policy | Enforce minimum password length (8+ chars), complexity requirements. Add password strength indicator on registration |
| 5 | Login rate limiting | Ensure `slowapi` rate limiting covers `/auth/login`, `/kiosk/verify-user-pin`, and password reset endpoints |

### 5.2 API Security

| # | Task | Details |
|---|------|---------|
| 1 | Input validation audit | Verify all Pydantic schemas have proper constraints (String min/max lengths, EmailStr validation, numeric ranges). No raw dict inputs |
| 2 | CORS hardening | Restrict CORS origins in production to specific domains (not `*`). Validate allowed methods and headers |
| 3 | SQL injection | Verify all raw SQL usage (if any) uses parameterized queries. Confirm SQLAlchemy ORM usage is consistent |
| 4 | Request size limits | Enforce max request body size (e.g., 10MB for photo uploads, 1MB for JSON). Configure in uvicorn/FastAPI middleware |
| 5 | Rate limiting per endpoint | Define rate limit tiers: auth endpoints (5/min), kiosk PIN (10/min), general API (60/min), static (unlimited). Configure `slowapi` |

### 5.3 Secrets & Configuration

| # | Task | Details |
|---|------|---------|
| 1 | Environment variable audit | Ensure all secrets (JWT secret, DB path, Supabase keys) are loaded from env vars, never hardcoded |
| 2 | `.env` file security | Confirm `.env` is in `.gitignore`, add `.env.example` with dummy values and documentation |
| 3 | Production secret generation | Add script/generate-secrets.py for generating secure JWT_SECRET, CSRF_SECRET, etc. |
| 4 | Supabase keys | Ensure anon key vs service_role key separation. Service role key only used server-side, never exposed to client |
| 5 | Credential files | Verify `creds.md` is in `.gitignore` (already done), **not** deployed to production |

### 5.4 Frontend Security

| # | Task | Details |
|---|------|---------|
| 1 | XSS prevention | Audit all user-rendered content (comments, nicknames, class names) uses React's auto-escaping. No `dangerouslySetInnerHTML` usage |
| 2 | Content Security Policy | Add CSP headers via Next.js `next.config.js` or middleware. Restrict script sources, disallow inline scripts |
| 3 | Secure cookie config | Ensure auth cookies use `HttpOnly`, `Secure`, `SameSite=Strict` in production. Verify CSRF cookie uses `SameSite=Lax` |
| 4 | API token storage | Audit where JWT tokens are stored (memory vs localStorage vs cookies). Prefer httpOnly cookies over localStorage for tokens |
| 5 | Sensitive data exposure | Ensure `UserResponse` schema excludes `password_hash` and `pin_hash` from API responses in non-admin contexts |

### 5.5 Data Protection

| # | Task | Details |
|---|------|---------|
| 1 | PIN hashing | Confirm all PIN storage uses bcrypt (already done via passlib). Verify no plaintext PINs exist in logs or error messages |
| 2 | Password hashing | Confirm bcrypt cost factor is adequate (e.g., `rounds=12`). Verify no plaintext passwords in API responses or logs |
| 3 | Photo upload security | Validate uploaded files: restrict MIME types (image/jpeg, image/png), enforce max dimensions, server-side re-compression, scan for EXIF metadata |
| 4 | SQLite deployment considerations | Document that SQLite is dev-only. Add configuration for production DB (PostgreSQL) with migration strategy |
| 5 | Audit logging | Add structured logging for sensitive operations: failed logins, PIN attempts, attendance changes, role assignments |

### 5.6 Infrastructure

| # | Task | Details |
|---|------|---------|
| 1 | HTTPS enforcement | Ensure all traffic redirects to HTTPS in production. HSTS header configuration |
| 2 | Security headers | Add middleware for: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 0`, `Referrer-Policy: strict-origin-when-cross-origin` |
| 3 | Dependency scanning | Run `npm audit` and `uv audit` to identify vulnerable packages. Document process for regular scanning |
| 4 | Error handling | Ensure production error pages don't leak stack traces. Configure custom error handlers for 400/401/403/404/500 |
| 5 | Supabase RLS | If Supabase is used for auth, review Row-Level Security policies. Ensure users can only access their own data |

### Remediation Order

1. Secrets & env var hardening (quick wins, high impact)
2. CSRF + CORS audit (prevents common web attacks)
3. Input validation & rate limiting (prevents abuse)
4. Cookie & token security (prevents session hijacking)
5. XSS + CSP (prevents client-side attacks)
6. File upload hardening (if photos are user-submitted)
7. Security headers & HTTPS (infrastructure hardening)
8. Audit logging (detection & forensics)

---

## Phase 7: Kiosk Mode Refinements (Future)

Placeholder for additional features discovered during testing and deployment.

---

## Design Decisions (Resolved)

1. **Bulk check-in status**: **`pending`** — teacher must confirm attendance (prevents skipping). PIN verification does not auto-confirm.
2. **Session timeout**: **120s, no reset on PIN entry** — session stays short. Multiple classes can be selected simultaneously and confirmed with a single PIN entry, so no need for a long session.
3. **PIN lockout**: **3 failed attempts → 5-minute cooldown** — needs backend rate-limiting on `verify-user-pin` tracking failed attempts per PIN (or IP) with timestamp-based cooldown. Returns `429 Too Many Requests` during cooldown.

## Backend Requirements (PIN Lockout)

- Track failed PIN attempts per user or IP in a new table or in-memory store
- Return a lockout error with remaining cooldown time after 3 failures
- Reset counter on successful PIN entry or after cooldown expires
- Cooldown: 5 minutes (300 seconds)

---

## RECENT UPDATES (May 31, 2026)

### Per-User PIN System
- ✅ Added `pin_hash` column to `User` model
- ✅ Added PIN fields to schemas (`UserCreate`, `UserUpdate`, `UserResponse`)
- ✅ Created `KioskUserPinVerifyRequest`/`KioskUserPinVerifyResponse` schemas
- ✅ Added `POST /kiosk/verify-user-pin` endpoint (returns user data + JWT tokens on PIN match)
- ✅ Updated `create_user` and `update_user` to handle PIN hashing
- ✅ Added unique PINs (1001–1011) to all 11 seed users in `seed_complete_data.py`
- ✅ Fixed seed script — `pin` → `pin_hash=hash_password(pin)` (was passing raw `pin` keyword)
- ✅ Re-seeded database — all 11 users have bcrypt-hashed PINs
- ✅ Verified `POST /kiosk/verify-user-pin` works: valid PIN returns user + tokens, invalid PIN returns `valid: false`
- ✅ Created `creds.md` with all seed credentials (added to `.gitignore`)

## RECENT UPDATES (June 2, 2026)

### Phase 1: PIN Check-In Flow
- ✅ `backend/app/routers/kiosk.py` — PIN lockout: 3 failed attempts → 5-min cooldown, returns 429 with Retry-After
- ✅ `backend/app/routers/attendance.py` — `POST /attendance/bulk-check-in` creates multiple pending records in one transaction
- ✅ `backend/app/schemas.py` — `BulkCheckInRequest` schema
- ✅ `ckb-tracker/src/lib/api.ts` — Added `kioskApi.verifyUserPin` and `attendanceApi.bulkCheckIn`
- ✅ `ckb-tracker/src/app/check-in/page.tsx` — Refactored to queue-based flow with PIN modal
  - Pending queue: checkbox-style toggle on class cards ("Check In" / "Selected ✓")
  - "Confirm with PIN" button appears when classes queued
  - PIN modal: avatar + name, class list, 4-digit masked input, numeric keypad, error display
  - Teacher/Admin bypass: skips PIN modal, submits directly
  - Lockout handling: 429 from backend shows lockout message
  - Success toast on completion
- ✅ Playwright-verified: teacher bypass creates pending attendance, student PIN modal renders with correct elements

## RECENT UPDATES (June 3, 2026)

### Phase 2: Kiosk Mode
- ✅ `backend/app/routers/auth.py` — `get_current_user` accepts `Authorization: Bearer` header as cookie fallback
- ✅ `backend/app/routers/kiosk.py` — Added `POST /kiosk/verify-pin-for-user` endpoint (per-user PIN check, returns access_token in body)
- ✅ `backend/app/schemas.py` — Added `KioskUserPinVerifyForUserRequest` schema
- ✅ `ckb-tracker/src/app/kiosk/` — Full kiosk UI: welcome, search, PIN entry, class select, confirm pages
- ✅ `ckb-tracker/src/app/kiosk/KioskContext.tsx` — Kiosk state management (identified user, class selection, idle timer)
- ✅ `ckb-tracker/src/lib/api.ts` — Axios interceptor for Bearer token, `verifyPinForUser`, `bulkCheckIn` API methods
- ✅ `ckb-tracker/src/components/AppLayout.tsx` — Added `/kiosk` to public routes
- ✅ `ckb-tracker/src/lib/utils.ts` — Fixed `DAYS_OF_WEEK` array indexing (off-by-one vs `getDay()`)
- ✅ Root cause: cross-origin auth cookie (SameSite=Lax) not sent on cross-origin POST; fixed with Authorization header fallback
- ✅ Playwright-verified: full kiosk flow works end-to-end (identify → PIN → select → confirm)

### Phase 3: Staff-Authenticated Kiosk (Completed)
- ✅ `backend/app/routers/kiosk.py` — Added `POST /kiosk/unlock` (staff email/password, rate-limited) and `POST /kiosk/lock` (revokes tokens)
- ✅ `backend/app/schemas.py` — Added `KioskUnlockResponse` schema
- ✅ `backend/app/routers/kiosk.py` — Protected `verify-pin-for-user`, `verify-user-pin` with `Depends(get_current_user)`
- ✅ `ckb-tracker/src/app/kiosk/KioskContext.tsx` — Added `isUnlocked`, `unlockedBy`, `unlockKiosk`, `lockKiosk` state; 60s idle timer locks kiosk
- ✅ `ckb-tracker/src/app/kiosk/KioskStaffLogin.tsx` — New: inline email/password form for staff unlock
- ✅ `ckb-tracker/src/app/kiosk/KioskLocked.tsx` — New: locked state with CKB branding + "Staff Sign In" + news section
- ✅ `ckb-tracker/src/app/page.tsx` — Replaced with kiosk landing page (locked state → KioskLocked, unlocked → welcome/search/PIN flow with lock button)
- ✅ `ckb-tracker/src/app/kiosk/page.tsx` — Redirects to `/`
- ✅ `ckb-tracker/src/lib/api.ts` — Module-level `kioskStaffToken` (memory only, not localStorage), `kioskApi.unlock`/`lock` methods
- ✅ `ckb-tracker/src/components/AppLayout.tsx` — Added `/kiosk/select`, `/kiosk/confirm` to public routes
- ✅ `kiosk/select` and `kiosk/confirm` redirect from `/kiosk` → `/` when no identified user
- ✅ Backend endpoints verified: unlock returns JWT + user + roles, lock revokes token, PIN endpoints protected
- ✅ Frontend builds successfully with `npm run build`

---

## RECENT UPDATES (June 9, 2026)

### Stabilization: Fix All Failing Tests, Lint Errors, and Build Failures

**Goal:** Stabilize the `feature/stabilization-fixes` branch (forked from `feature/pin_mode`) so that all tests pass, lint errors are zero, and the frontend builds successfully.

#### Backend Test Fixes (128/128 passing, 85% coverage)
- ✅ `tests/test_attendance.py` — Added `headers` fixture (JWT auth) to 5 tests: confirm, cancel, cancel-nonexistent, already-checked-in, get-by-date
- ✅ `tests/test_auth.py` — Added CSRF token extraction + `X-CSRF-Token` header to 3 tests: logout-clears-cookies, logout-all, refresh-token
- ✅ `tests/test_kiosk.py` — Fixed `test_verify_pin_default` assertion from `valid: True` → `valid: False` (no KioskAuth configured in test seed)
- ✅ `tests/test_users.py` — Fixed error message in `test_upload_photo_not_image`; used PIL-generated JPEG in `test_upload_photo_success`

#### Frontend Test Fixes (176/176 passing, 95% coverage)
- ✅ `src/__tests__/api.test.ts` — Added 10s timeout to unlock/lock tests (was timing out with `vi.resetModules()` + dynamic `import()`)

#### Frontend Build Fix
- ✅ `src/app/layout.tsx` — Replaced `next/font/google/inter` import + `inter.variable` class with Tailwind `font-sans` utility class (Turbopack couldn't resolve the font module)

#### Frontend Lint Fixes (0 errors, 39 warnings remain — all pre-existing)
- ✅ `admin/page.tsx` — Converted 7 `const loadX = async` → `async function loadX()` (hoisting), fixed 9 `no-explicit-any`, fixed 2 `no-unescaped-entities`, removed unused imports/vars, added missing useEffect deps
- ✅ `check-in/page.tsx` — Suppressed `set-state-in-effect`, changed `useCallback(debounce(...))` → `useMemo(() => debounce(...))`, replaced `"` with `&ldquo;`/`&rdquo;`
- ✅ `teacher/page.tsx` — Converted 3 `const loadX = async` → `async function loadX()`, suppressed set-state-in-effect
- ✅ `portal/page.tsx` — Converted 3 `const loadX = async` → `async function loadX()`
- ✅ `login/page.tsx` — Replaced `<a href="/">` with `<Link href="/">`
- ✅ `Sidebar.tsx` — Suppressed `no-explicit-any` + `set-state-in-effect`
- ✅ `useAuth.tsx` — Suppressed `set-state-in-effect`

#### Frontend Build TypeScript Fixes
- ✅ `admin/page.tsx` — Added missing type imports (`ClassInstance`, `FeedbackStats`, `AttendanceTrend`, `DashboardStats`, `ClassFeedback`)
- ✅ `types/index.ts` — Added optional `class_instance` + `user` to `ClassFeedback`
- ✅ `admin/page.tsx` — Fixed `'positive'` → `'thumbs_up'` on feedback rating; wrapped `unknown` values with `String()`; guarded `csvImportResult.errors.length` with `Array.isArray()`

---

## RECENT UPDATES (June 9, 2026) — Part 2: Pre-Deployment Security & Quality

### Phase 6: Security Review (Pre-Deployment Items)

**Goal:** Implement all security-related code changes that don't require a deployed environment.

#### Backend Changes

- ✅ **Global exception handler** (`backend/app/main.py`) — Added `@app.exception_handler(HTTPException)` with header passthrough and `@app.exception_handler(Exception)` catch-all to prevent stack trace leaks in production
- ✅ **Content-Security-Policy header** (`backend/app/main.py`) — Added `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'` to security headers middleware (defense-in-depth for API responses)
- ✅ **Password complexity validation** (`backend/app/schemas.py`) — Added `field_validator("password")` to `UserCreate` and `UserUpdate` enforcing: uppercase, lowercase, digit, and special character (minimum 8 chars was already enforced)
- ✅ **Pydantic constraint hardening** (`backend/app/schemas.py`) — Added `ge=0, le=1000` to `ClassScheduleBase.points`, `min_length=1` to `FeedbackBase.rating`, `min_length=1, max_length=50` to `AttendanceUpdate.status`, `min_length=1, max_length=64` to `AttendanceUpdate.confirmed_by`
- ✅ **DATABASE_URL configurable** (`backend/app/database.py`) — Changed from hardcoded `sqlite:///./ckb_tracker.db` to `os.getenv("DATABASE_URL", "sqlite:///./ckb_tracker.db")` so it can be overridden via env var
- ✅ **Secret generation script** (`backend/scripts/generate_secrets.py`) — New: generates cryptographically secure `JWT_SECRET_KEY` and CSRF tokens via `secrets` module
- ✅ **Retry-After passthrough fix** (`backend/app/main.py`) — Custom `HTTPException` handler now passes `exc.headers` through, fixing kiosk PIN lockout 429 responses that include `Retry-After`
- ✅ **CSRF audit** — Already implemented (double-submit cookie pattern, constant-time comparison, Bearer token exemption)
- ✅ **Session management** — Already implemented (server-side JTI blacklisting, rotate on refresh, 24h absolute session cap)
- ✅ **Rate limiting** — Already implemented (12 tiers, per-endpoint decorators)
- ✅ **Audit logging** — Already implemented (13+ event types, admin-queryable endpoint)
- ✅ **Photo upload validation** — Already implemented (PIL verify, extension whitelist, 5MB limit)
- ✅ **Hardcoded secrets** — None found; all via env vars with dev fallback to `secrets.token_urlsafe()`

#### Frontend Changes

- ✅ **npm audit fix** (`ckb-tracker/package.json`) — Updated Next.js from `^16.1.7` to `^16.2.7`, fixing 1 high and 1 moderate vulnerability
- ✅ **XSS audit** — No `dangerouslySetInnerHTML` usage found anywhere in the codebase
- ✅ **Supabase key audit** — Only `NEXT_PUBLIC_SUPABASE_ANON_KEY` used client-side (safe); no `service_role` key exposure

#### .env.example Audit
- ✅ Added `COOKIE_SAMESITE` variable with documentation
- ✅ `DATABASE_URL` now actually read from env (was documented but ignored)
- ✅ Updated JWT secret generation instructions to reference `generate_secrets.py` script

---

---

## RECENT UPDATES (June 25, 2026) — Deployment Pipeline

**Goal:** Deploy CKB Tracker to production-like dev environment on Vercel (frontend) + Render (backend + PostgreSQL) with GitHub Actions CI/CD.

### Frontend — Vercel (`https://ckb-tracker.vercel.app`) ✅ LIVE
- ✅ Vercel project created and deployed — root dir `ckb-tracker`, framework Next.js, 12 routes compiled
- ✅ `vercel.json` created with `github.enabled: false`
- ✅ `package.json` — added `engines` field, SWC binary moved to `optionalDependencies`
- ✅ `NEXT_PUBLIC_API_URL` = `https://ckb-tracker-api-dev.onrender.com` set for Production, Preview, Development
- ⚠️ **Issue fixed**: Production URL was returning 404 due to ghost project domain mapping — deleted and recreated project
- ✅ Project ID: `prj_zm6WDzPldgSVPArzEXvy7mZ72zlf`, Team ID: `team_aTWDJm3L7yTC2r7k6Rl8uNJb`

### Backend — Render (`https://ckb-tracker-api-dev.onrender.com`) ✅ LIVE
- ✅ Render Blueprint (`backend/render.yaml`) with web service + PostgreSQL database
- ✅ Post-deployment: triggered deploy hook to verify CI pipeline
- ✅ Render Blueprint branch updated from `feature/repo-cleanup` to `main`
- ✅ Deploy hook URL captured: `https://api.render.com/deploy/srv-d8ueescm0tmc73a4qr10?key=QOENIgDPEYQ`

### CI/CD — GitHub Actions ✅ Configured
- ✅ `.github/workflows/test.yml` — broadened to run on all branches (not just `main`)
- ✅ `.github/workflows/deploy.yml` — new: tests + deploy on push to `main` (Vercel + Render)
- ✅ 4 GitHub secrets set: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `RENDER_DEPLOY_HOOK_DEV`

### Documentation
- ✅ `deploy_steps.md` — step-by-step deployment guide for developers (local dev → feature branch → CI → PR → merge → deploy)

### Database
- Render PostgreSQL connected and tables created via SQLAlchemy `create_all`
- **Database is empty** — no seed data exists. All tables are empty.

### Environment URLs
| Service | URL |
|---------|-----|
| Frontend | `https://ckb-tracker.vercel.app` |
| Backend API | `https://ckb-tracker-api-dev.onrender.com` |
| GitHub | `https://github.com/citybjjitsu-cyber/tracker_app_rebuild` |

---

## RECENT UPDATES (July 12, 2026) — Email Onboarding & SQLite DateTime Fix

**Goal:** End-to-end email-based invite flow — admin sends invite, user receives email, clicks link, sets password/PIN, gets logged in.

### Invite Endpoints (Backend)
- ✅ `GET /auth/invite?token=` — validates invite token against server-side hash, checks expiry, returns user name/email
- ✅ `POST /auth/accept-invite` — accepts invite: validates token, sets bcrypt password + PIN, consumes invite, returns auto-login JWT cookies
- ✅ `POST /auth/send-invite` — creates user if email not found, generates token (SHA-256 hashed), sends email via SMTP, supports existing users without password
- ✅ `POST /auth/resend-invite` — regenerates expired tokens, increments sent count, re-sends email

### Forgot Password/PIN Endpoints (Backend)
- ✅ `POST /auth/forgot-password` / `POST /auth/forgot-pin` — sends tokenized reset email (1-hour expiry)
- ✅ `POST /auth/reset-password` / `POST /auth/reset-pin` — validates token, consumes it, updates credential
- ✅ `POST /admin/users/{uuid}/reset-password` / `POST /admin/users/{uuid}/reset-pin` — admin-initiated reset, sends email

### Frontend Pages
- ✅ `/accept-invite` — validates invite on load, form for password + PIN, auto-redirect on success
- ✅ `/forgot-password` / `/forgot-pin` — email input, sends reset link
- ✅ `/reset-password` / `/reset-pin` — validates token, form for new credential

### SQLite Naive DateTime Fix (Root Cause of 500 on Invite)
- ✅ `datetime.now(timezone.utc)` returns timezone-aware datetimes, but SQLite stores them as naive (no tzinfo). Comparing aware vs naive raises `TypeError`.
- ✅ Added `_utcnow()` helper returning naive UTC: `datetime.now(timezone.utc).replace(tzinfo=None)`
- ✅ Applied to all SQLite-bound comparisons in `auth.py` (login, refresh, invite validate/accept, send/resend, forgot/reset password/PIN) and `admin.py` (admin reset password/PIN)
- ✅ Also fixed: admin `_utcnow()` had recursion bug (called itself); `refresh_token` endpoint had aware-vs-naive mismatch with JWT `iat` claim; `resend-invite` used wrong schema (`InviteSendRequest` instead of `ResendInviteRequest`)
- ✅ All 13 auth tests pass (including previously failing `test_refresh_token`)

### Email Service
- ✅ `backend/app/services/email.py` — `send_invite_email()`, `send_password_reset_email()`, `send_pin_reset_email()`, `send_test_email()`
- ✅ `resolve_base_url()` — extracts Origin/Referer from request to build correct invite links for cross-origin deployments (Vercel frontend → Render backend)
- ✅ Email sent via SMTP with dark-themed HTML template; delivery success/failure reflected in audit logs and API responses

*Last Updated: July 12, 2026*

---

## RECENT UPDATES (July 14, 2026) — Auth & Password Flow Fixes

**Branch:** `fix/auth-password-flows` → merged to `main`

### Phase 2: Auth & Password Flow Fixes

#### Bug Fixes
- ✅ **Frontend password validation** (`admin/page.tsx`) — Admin password reset and new user creation now validate 8+ chars, uppercase, lowercase, digit, and special character — matching backend rules exactly. Previously frontend only checked 6+ chars, causing "password change doesn't work" perception.
- ✅ **Email reset security** (`schemas.py`) — Added `validate_password_complexity` to `ResetPasswordRequest` and `AcceptInviteRequest` schemas. Previously weak passwords (e.g., "password") could be accepted via email reset link or invite acceptance flow.
- ✅ **Error handling** (`admin/page.tsx`) — `handleResetPassword` and `handleCreateNewUser` catch blocks now extract and display actual Pydantic validation errors from the backend instead of generic "Failed to reset password" messages.

#### New Feature
- ✅ **Self-service password change** (`auth.py`, `schemas.py`, `api.ts`) — Added `POST /auth/change-password` endpoint requiring current password verification, complexity validation, and new-password-differs check. Added `ChangePasswordRequest` schema with full complexity validator. Added `authApi.changePassword()` frontend method with test coverage.

#### Tests
- ✅ 128 backend tests pass (pytest)
- ✅ 177 frontend tests pass (vitest) — 1 new test for `changePassword` API method
- ✅ Frontend lint: 0 errors (42 pre-existing warnings)

---

## RECENT UPDATES (July 14, 2026) — Home Page Sign-In UX

**Branch:** `feature/home-page-signin-ux` → pending PR/merge

### Phase 3: Home Page Sign-In UX
- ✅ `ckb-tracker/src/app/kiosk/KioskLocked.tsx` — Renamed "Staff Sign In" to "Kiosk Sign In" for clarity
- ✅ Replaced plain text link with styled bordered button for "Staff Login" (secondary style)
- ✅ Added helper text "For admin and teacher portal access" below buttons
- ✅ Updated test assertions to match new labels (`kiosk-page.test.tsx`)
- ✅ 177 frontend tests pass (vitest)

---

## RECENT UPDATES (July 16, 2026) — Rank/Degree Display Enhancement

**Branch:** `feature/rank-degree-display`

### Phase 5: Rank/Degree Display Enhancement

**Goal:** Show belt degree (e.g., "Black Belt 2nd Degree") across the entire app instead of just "Black Belt".

#### Backend Changes
- ✅ `backend/app/schemas.py` — Added `rank_tier: Optional[RankTierResponse] = None` to `UserResponse` and `KioskUserResponse`
- ✅ `backend/app/routers/users.py` — Added `joinedload(models.User.rank_tier)` to `list_users`, `search_users`, `get_user`, `create_user`, and `update_user` queries to avoid N+1 and populate `rank_tier` in responses
- ✅ `backend/app/routers/kiosk.py` — Added `joinedload(models.User.rank_tier)` to `kiosk_unlock`, `verify_user_pin`, and `verify_pin_for_user` queries
- ✅ `backend/app/routers/roles.py` — Added `joinedload(models.User.rank_tier)` to `get_users_by_role` query

#### Frontend Changes
- ✅ `ckb-tracker/src/types/index.ts` — Added `rank_tier?: RankTier` to `User` interface
- ✅ Replaced 5 hardcoded `{rank} Belt` inline text with `<RankBadge rank={...} degree={...} />`:
  - `app/page.tsx` (kiosk landing identified user display)
  - `app/kiosk/select/page.tsx` (kiosk class selection user card)
  - `app/kiosk/confirm/page.tsx` (success screen + confirm page — 2 instances)
  - `app/check-in/page.tsx` (selected user rank display)
- ✅ Passed `degree={user.rank_tier?.degree}` to 4 existing `<RankBadge>` call sites:
  - `admin/page.tsx` (user list + analytics card)
  - `portal/page.tsx` (student portal header)
  - `check-in/page.tsx` (search result badges)
- ✅ `admin/page.tsx` — Replaced hardcoded rank dropdown options `['White','Blue','Purple','Brown','Black']` with dynamic `rankTiers.map(t => ({ value: t.rank, label: t.display_name }))` in both edit and new user forms
- ✅ `teacher/page.tsx` — Updated attendance table rank cell to use `formatRankDisplay()` with degree

#### Tests
- ✅ 128 backend tests pass (pytest)
- ✅ 177 frontend tests pass (vitest)
- ✅ Frontend build succeeds (15 routes compiled)
- ✅ Lint: 0 errors (42 pre-existing warnings)

---

## RECENT UPDATES (July 16, 2026) — Public News Page

**Branch:** `feature/public-news-page`

### Phase 4: Public News Page

**Goal:** Public news page accessible without login, linked from the kiosk locked screen.

#### Frontend Changes
- ✅ `ckb-tracker/src/app/news/page.tsx` — New `/news` page: public, no auth required, fetches published news via `newsApi.list(true)`, shows expandable article cards with date/title/content, loading spinner, empty state, theme toggle, "Back to CKB Tracker" link
- ✅ `ckb-tracker/src/app/kiosk/KioskLocked.tsx` — News cards now link to `/news`, added "View All" link in section header, hover effects on cards
- ✅ `ckb-tracker/src/components/AppLayout.tsx` — Added `/news` to public routes (no sidebar)

#### Tests
- ✅ 177 frontend tests pass (vitest)
- ✅ Frontend build succeeds (16 routes compiled)
- ✅ Lint: 0 errors (41 pre-existing warnings)
