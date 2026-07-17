# CKB Tracker — Pre-Launch Rollout Plan

**Goal:** Resolve all identified issues before limited user testing.
**Deployment:** Vercel (frontend) + Render (backend). Each phase merged to `main` auto-deploys.
**Process per phase:** Feature branch → implement → test locally → commit → push → PR → merge to main → verify on Vercel.

---

## Phase 1: Admin Page Cleanup & Quick Fixes
**Branch:** `feature/admin-cleanup`

| # | Task | Files |
|---|------|-------|
| 1a | Remove "Student Passwords" tab (read-only, no actions) | `admin/page.tsx` |
| 1b | Remove "Kiosk Management" tab (legacy shared PIN, disconnected from per-user PIN) | `admin/page.tsx` |
| 1c | Move "Invites" tab from position 16 to position 2 (after "User Admin") | `admin/page.tsx` |
| 1d | Fix negative target points — add `ge=0` to `RankTierUpdate.target_points`, add `min="0"` to frontend input | `schemas.py`, `admin/page.tsx` |
| 1e | Fix rank tier update endpoint — add `Depends(get_admin_user)` (currently unauthenticated) | `rank_tiers.py` |
| 1f | Fix PIN regex — add `pattern=PIN_REGEX` to `UserCreate.pin` and `UserUpdate.pin` | `schemas.py` |

**Commit:** `fix: admin page cleanup, validation fixes, and auth hardening`

---

## Phase 2: Auth & Password Flow Fixes
**Branch:** `fix/auth-password-flows`
**Commit:** `b58955b` — merged to `main`

| # | Task | Files | Status |
|---|------|-------|--------|
| 2a | Fix admin edit panel password change — frontend now validates 8+ chars + complexity matching backend | `admin/page.tsx` | ✅ |
| 2b | Fix email reset flow — added complexity validators to `ResetPasswordRequest` and `AcceptInviteRequest` schemas | `schemas.py` | ✅ |
| 2c | Fix error handling — `handleResetPassword` and `handleCreateNewUser` now show actual backend error details | `admin/page.tsx` | ✅ |
| 2d | Add self-service `POST /auth/change-password` endpoint (old password + new password, complexity enforced) | `auth.py`, `schemas.py`, `api.ts` | ✅ |

**Tests:** 128 backend ✅, 177 frontend ✅ (1 new test for `changePassword`)

---

## Phase 3: Home Page Sign-In UX
**Branch:** `feature/home-page-signin-ux`
**Commit:** `a745953` — pushed to remote, pending PR/merge

| # | Task | Files | Status |
|---|------|-------|--------|
| 3a | Rename "Staff Sign In" → "Kiosk Sign In" | `KioskLocked.tsx` | ✅ |
| 3b | Replace text link with styled "Staff Login" button | `KioskLocked.tsx` | ✅ |
| 3c | Style both buttons with clear visual distinction (primary vs secondary) | `KioskLocked.tsx` | ✅ |

**Tests:** 177 frontend ✅

---

## Phase 4: Public News Page
**Branch:** `feature/public-news-page`

| # | Task | Files | Status |
|---|------|-------|--------|
| 4a | Create `/news` page — public, no auth, feed of all published news | `app/news/page.tsx` | ✅ |
| 4b | Make home page news items clickable + "View All News" link | `KioskLocked.tsx` | ✅ |
| 4c | Add `/news` to public routes in AppLayout | `AppLayout.tsx` | ✅ |

**Tests:** 177 frontend ✅, frontend build ✅ (16 routes)

---

## Phase 5: Rank/Degree Display Enhancement
**Branch:** `feature/rank-degree-display`

| # | Task | Files | Status |
|---|------|-------|--------|
| 5a | Backend: Add `rank_tier` to `UserResponse` and `KioskUserResponse` via RankTier join + `joinedload` | `schemas.py`, `users.py`, `kiosk.py`, `roles.py` | ✅ |
| 5b | Frontend: Add `rank_tier?: RankTier` to `User` type | `types/index.ts` | ✅ |
| 5c | Replace all `{user.rank} Belt` plain text with `<RankBadge rank={...} degree={...} />` | `page.tsx`, `kiosk/select/page.tsx`, `kiosk/confirm/page.tsx`, `check-in/page.tsx` | ✅ |
| 5d | Pass `degree` to all existing `<RankBadge>` call sites | `admin/page.tsx`, `portal/page.tsx`, `check-in/page.tsx` | ✅ |
| 5e | Update rank dropdowns to show full display names with degrees | `admin/page.tsx` (edit + new user forms) | ✅ |
| 5f | Update teacher attendance table rank display with degree | `teacher/page.tsx` | ✅ |

**Tests:** 128 backend ✅, 177 frontend ✅, frontend build ✅

---

## Phase 6: Teacher View Redesign & Permissions
**Branch:** `feature/teacher-view-redesign`

| # | Task | Files |
|---|------|-------|
| 6a | Remove "Class Roster" tab (redundant with attendance tab) | `teacher/page.tsx` |
| 6b | Redesign dashboard with weekly calendar grid for class selection | `teacher/page.tsx` |
| 6c | Add teacher permission for student creation (basic profiles: name + email only) | `users.py`, `auth.py` |
| 6d | Add "Create New Student" form in teacher page (no PIN/password — set via invite) | `teacher/page.tsx` |

**Commit:** `feat: redesign teacher dashboard with weekly calendar and student creation`

---

## Phase 7: User Deactivation & Reactivation
**Branch:** `feature/user-deactivation`

| # | Task | Files | Status |
|---|------|-------|--------|
| 7a | Add `POST /admin/users/{uuid}/toggle-active` endpoint (admin-only) | `admin.py` | ✅ |
| 7b | Add activate/deactivate button per user in admin User Admin tab | `admin/page.tsx` | ✅ |
| 7c | Filter inactive users from kiosk search and check-in name search | `users.py` | ✅ (already filtered via `is_current`) |
| 7d | Add "Show Inactive" filter toggle in admin User Admin tab | `admin/page.tsx` | ✅ |
| 7e | Add `include_inactive` param to `list_users` endpoint | `users.py` | ✅ |

**Tests:** 128 backend ✅, 177 frontend ✅, frontend build ✅

---

## Phase 8: Kiosk Session Persistence
**Branch:** `feature/kiosk-session`

**Goal:** Fix kiosk so it stays authenticated and live on the "Find your name" screen for the full duration of a class block, without silent failures or unwanted idle locks.

### Why

- Kiosk staff unlocks once to allow mat-side student check-ins for a class
- Current idle timeout (60s) is too aggressive — a class is 30–60+ minutes
- Current access token expires in 10 minutes with no auto-refresh — kiosk breaks silently after 10 min
- The "Find your name" screen must stay visible and responsive the entire time
- Kiosk is a shared public terminal, not a personal session — different auth model

### Pre-requisites

- All Phase 1–7 features merged and stable
- Device power/sleep settings handled on the physical device (out of scope)

---

| # | Task | Files |
|---|------|-------|
| 8a | Make kiosk idle timeout configurable — add `KIOSK_IDLE_MINUTES` env var (default `240` = 4 hours) | `app/auth/config.py`, `app/routers/kiosk.py` |
| 8b | Update `KioskContext.tsx` idle timer to use backend-configured value instead of hardcoded 60s | `KioskContext.tsx`, `app/kiosk/page.tsx` (fetch config on unlock) |
| 8c | Add auto-refresh interceptor for kiosk tokens — on 401, attempt silent refresh using httpOnly refresh cookie, retry the failed request | `lib/api.ts` |
| 8d | On refresh failure (expired session), lock kiosk and redirect to home (same as explicit lock) | `KioskContext.tsx`, `lib/api.ts` |

**Tests:** 128 backend ✅, 177 frontend ✅, frontend build ✅

**Commit:** `fix: kiosk session persistence with configurable idle timeout and token auto-refresh`

---

## Phase 9: Database Migrations & Bootstrap
**Branch:** `feature/db-migrations`

**Goal:** Replace drop-and-recreate DB management with proper migrations (Alembic) and a repeatable bootstrap pattern. This is the foundation for reliable production deploys and future schema changes.

### Why

- `DROP_ALL_ON_STARTUP` and "Reset Database" are nuclear options — they destroy all data
- No way to evolve the schema incrementally (adding a column means wiping the DB)
- Auto-seeding demo data in `main.py` lifespan is fragile and dangerous in production
- No CLI tooling to bootstrap an admin account after a DB reset
- Every future schema change currently requires a full DB wipe

### Pre-requisites

- Render Basic plan DB (confirmed ✅ — has backup/restore)
- All Phase 1–8 features merged and stable

---

### Step 1: Add Alembic
| # | Task | Files |
|---|------|-------|
| 1a | Install Alembic: `uv add alembic` | `pyproject.toml` |
| 1b | Initialize: `uv run alembic init backend/alembic` | `alembic/` directory |
| 1c | Configure `alembic.ini` — set `sqlalchemy.url` to read from `DATABASE_URL` env var | `alembic.ini` |
| 1d | Configure `alembic/env.py` — import `models.Base` for autogenerate support, read `DATABASE_URL` from env | `alembic/env.py` |
| 1e | Verify: `uv run alembic heads` runs without error | — |

### Step 2: Create Initial Migration
| # | Task | Files |
|---|------|-------|
| 2a | Generate initial migration from current models: `uv run alembic revision --autogenerate -m "initial schema"` | `alembic/versions/001_initial.py` |
| 2b | Review generated migration — ensure it matches current `create_all` output | `alembic/versions/001_initial.py` |
| 2c | Test on a fresh SQLite DB: delete `ckb_tracker.db`, run `uv run alembic upgrade head`, verify tables exist | — |
| 2d | Test downgrade: `uv run alembic downgrade base`, verify tables dropped cleanly | — |

### Step 3: Create Bootstrap CLI Command
| # | Task | Files |
|---|------|-------|
| 3a | Create `backend/app/cli.py` with Click or argparse | `app/cli.py` |
| 3b | `bootstrap` command — creates: roles, admin account, kiosk service account. Idempotent (skips if already exists). Accepts `--email` and `--password` flags | `app/cli.py` |
| 3c | `migrate-and-bootstrap` command — runs `alembic upgrade head` then `bootstrap`. Intended for Render start command | `app/cli.py` |
| 3d | Add entry point to `pyproject.toml` so commands work via `uv run ckb bootstrap` | `pyproject.toml` |

### Step 4: Remove Auto-Seed from Lifespan
| # | Task | Files |
|---|------|-------|
| 4a | Remove the `user_count == 0` auto-seed block from `main.py` lifespan (lines ~106–143) | `main.py` |
| 4b | Remove the `existing_tablet_role` / `existing_lite_admin_role` checks from lifespan (moved to bootstrap) | `main.py` |
| 4c | Keep rank tier seeding and `rank_tier_id` backfill in lifespan (these are safe, idempotent migrations) | `main.py` |
| 4d | Update Render start command to: `cd backend && uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT` | `render.yaml` |
| 4e | Add `KIOSK_IDLE_MINUTES: "240"` to `render.yaml` env vars | `render.yaml` |

### Step 5: Clean Up Seed Scripts
| # | Task | Files |
|---|------|-------|
| 5a | Delete `seed_complete_data.py` entirely (demo data removed) | `seed_complete_data.py` |
| 5b | Remove `POST /admin/seed` endpoint | `admin.py` |
| 5c | Remove `GET /database/export-seed` endpoint (replaced by generic JSON export) | `database.py` |
| 5d | Keep admin Database tab: backup, restore, reset (reset now just drops + migrates, no auto-seed) | `database.py` |
| 5e | Update `reset_database` to run `alembic upgrade head` after dropping tables instead of `create_all` | `database.py` |

### Step 6: Production Bootstrap Runbook
| # | Task | Files |
|---|------|-------|
| 6a | Document the one-time bootstrap procedure in `BOOTSTRAP.md` | `BOOTSTRAP.md` |
| 6b | After deploy, SSH or use Render shell: `uv run ckb bootstrap --email admin@yourgym.com --password SecurePass123` | — |
| 6c | Verify: log in as admin, confirm roles exist, confirm empty user list (except admin) | — |
| 6d | Build class structure via Admin UI (gyms, class types, schedules, terms, targets) | — |
| 6e | Invite pilot users via Admin → Invites | — |
| 6f | **Remove** `DROP_ALL_ON_STARTUP` from Render env vars (if set) | — |

### Step 7: Update Deploy Workflow
| # | Task | Files |
|---|------|-------|
| 7a | Update `deploy.yml` — add `alembic upgrade head` step before backend tests | `.github/workflows/deploy.yml` |
| 7b | Update `test.yml` — add migration step to backend test job | `.github/workflows/test.yml` |
| 7c | Add CI check: `uv run alembic check` (detects unapplied migrations) | `.github/workflows/test.yml` |

---

**Tests:** All existing tests must pass. Add tests for CLI bootstrap command (idempotency, creates roles + admin). Backend coverage ≥ 75%.

**Commit:** `feat: add Alembic migrations and bootstrap CLI for production-ready DB management`

---

## Rollout Order (Priority)

| Order | Phase | Why |
|-------|-------|-----|
| 1 | Phase 1 | Quick wins, cleanup, security fixes |
| 2 | Phase 2 | Critical bug fixes (password flows) |
| 3 | Phase 3 | Quick UX improvement |
| 4 | Phase 5 | Highest user-facing impact (rank display) |
| 5 | Phase 4 | New feature (news page) |
| 6 | Phase 7 | Important admin feature (deactivation) |
| 7 | Phase 6 | Largest scope (teacher redesign) |
| 8 | Phase 8 | Kiosk session must work before pilot testing |
| 9 | Phase 9 | Production foundation (migrations, bootstrap, safe deploys) |

---

## Verification Checklist (Per Phase)

After each phase is merged to `main`:

- [ ] Frontend builds and deploys to Vercel successfully
- [ ] Backend deploys to Render successfully
- [ ] No regressions in existing functionality
- [ ] Changed features verified manually on Vercel preview
- [ ] Backend tests pass (pytest, coverage ≥ 75%)
- [ ] Frontend tests pass (vitest, thresholds met)

---

## First-Time Bootstrap (Repeatable)

This is the one-time setup for a fresh deployment. Repeatable if the database is wiped.

1. Deploy code to Render (push to `main` triggers CD)
2. Render start command runs `alembic upgrade head` → creates all tables from migrations
3. Open Render Shell → run bootstrap:
   ```
   uv run ckb bootstrap --email admin@yourgym.com --password SecurePass123!
   ```
4. This creates:
   - 6 roles: Student, Teacher, Admin, Tablet, Lite-Admin, Kiosk
   - 1 admin user (your email + password)
   - 1 kiosk service account (kiosk@ckbtracker.com, role=Kiosk)
   - 35 rank tiers (7 ranks × 5 degrees, seeded by lifespan on first start)
5. Log in to Vercel frontend as admin
6. Build class structure via Admin UI:
   - Gym Locations → Class Types → Class Schedules → Terms → Term Targets
7. Invite pilot users via Admin → Invites

**Verify:** Log in as admin → confirm roles exist → confirm empty user list (only admin) → kiosk unlock works.

---

## Testing Rollout (Prod Vercel, Fresh DB)

**Pre-conditions:** Phase 9 merged to `main`, Render + Vercel auto-deployed, fresh database.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Check Render logs | `alembic upgrade head` ran, no seed data, no errors |
| 2 | Render Shell: `uv run ckb bootstrap --email admin@yourgym.com --password ...` | 6 roles + admin + kiosk account created |
| 3 | Log in as admin at Vercel URL | Dashboard loads, empty user list (admin only) |
| 4 | Create 1 gym location, 1 class type, 1 class schedule | Visible in admin UI |
| 5 | Create 1 test student via Admin UI | Student appears in user list |
| 6 | Unlock kiosk → find student → enter PIN → check-in | Attendance recorded |
| 7 | Wait 10+ minutes → verify kiosk stays live | Auto-refresh works, no 401 errors |
| 8 | Test admin invite flow: invite → accept → set PIN → kiosk check-in | Full loop works |
| 9 | Test teacher page: log in as teacher → view attendance | Correct data shown |
| 10 | Test deactivation: deactivate student → verify hidden from kiosk | Student not in search |

**Teardown after testing:** Admin Database tab → `POST /database/reset` → re-bootstrap via Render Shell.

---

## Production Rollout

**Pre-conditions:** Testing phase complete, all features verified, no outstanding bugs.

| Step | Action | Notes |
|------|--------|-------|
| 1 | Final merge to `main` | All Phase 9 work included |
| 2 | Reset database if testing data exists | Render Shell: `POST /database/reset`, then re-bootstrap |
| 3 | Bootstrap production admin | `uv run ckb bootstrap --email production-admin@yourgym.com --password ...` |
| 4 | Configure production env vars in Render | See table below |
| 5 | Build class structure | Gym locations, class types, schedules, terms, targets |
| 6 | Invite real users | Admin → Invites → send emails |
| 7 | Each user: accept invite → set password → set PIN | Verify login + kiosk check-in |
| 8 | Verify kiosk on physical tablet device | Staff unlock → student check-in → stays live 4+ hours |
| 9 | Monitor Render logs for errors | Watch first 24 hours closely |

### Production Environment Variables (Render Dashboard)

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | Auto-injected from DB | — |
| `JWT_SECRET_KEY` | Set manually | Strong random string |
| `CORS_ORIGINS` | `https://yourgym.vercel.app` | Comma-separated if multiple |
| `ALLOWED_HOSTS` | `yourgym.vercel.app` | — |
| `COOKIE_SECURE` | `True` | — |
| `COOKIE_SAMESITE` | `None` | Required for cross-origin |
| `ENVIRONMENT` | `production` | — |
| `HSTS_ENABLED` | `True` | — |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10` | — |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | — |
| `MAX_SESSION_HOURS` | `24` | — |
| `KIOSK_IDLE_MINUTES` | `240` | 4 hours, adjust as needed |
| `SMTP_HOST` | Set manually | For invite emails |
| `SMTP_PORT` | `587` | — |
| `SMTP_USER` | Set manually | — |
| `SMTP_PASSWORD` | Set manually | — |
| `INVITE_FROM_EMAIL` | Set manually | — |

---

## Rollback Plan

### During Testing (no real user data)

| Scenario | Action | Risk |
|----------|--------|------|
| Frontend bug | Vercel → Deployments → previous deploy → "Promote to Production" | None |
| Backend code bug | Render → Manual Deploy → redeploy previous commit | None |
| DB migration broke schema | Render Shell: `uv run alembic downgrade -1` | Low (no user data) |
| Total reset | Render Shell: `uv run alembic downgrade base` → re-bootstrap | None (fresh DB) |
| Nuclear option | Set `DROP_ALL_ON_STARTUP=true` in Render → redeploy → unset → re-bootstrap | None |

### After Production Rollout (real user data exists)

| Scenario | Action | Data Impact |
|----------|--------|-------------|
| Frontend bug | Vercel → previous deploy (instant) | None |
| Backend code bug | Render → redeploy previous commit | None (DB unchanged) |
| DB migration broke schema | `uv run alembic downgrade -1` via Render Shell, then redeploy previous code | Minimal (1 migration rolled back) |
| DB corruption / data loss | Render → Database → "Restore from backup" (PITR on Basic plan) | Point-in-time restore |
| App-level backup | Admin Database tab → Export JSON → Import to restore | Manual, full restore |
| Total disaster | Render PITR restore → redeploy previous code → verify | Full restore from backup |

### Key Principle

> Vercel rollback is instant and zero-risk. Render rollback requires care: always **downgrade the database first** if the schema changed, then redeploy the older code. Never redeploy old code against a newer schema.

---

## Admin Onboarding Runbook

### Day 1 — First Deploy

1. Confirm Render service shows "Live" status (check deploy logs)
2. Open Render Shell → run bootstrap command with your admin credentials
3. Open Vercel URL → log in as admin
4. Create gym locations (name + address for each mat location)
5. Create class types (Gi, No-Gi, MMA, Open Mat, Kids, etc.)
6. Create class schedules (day, time, gym, type for each recurring class)
7. Create current term (e.g., "Fall 2026") with start/end dates
8. Set rank tier targets for the term

### Day 2 — Invite Users

1. Admin → Invites → send invite to each staff member (teacher/admin email)
2. Send invites to pilot students
3. Each person: click email link → set password → set 4-digit PIN
4. Verify login works for each role (admin, teacher, student)

### Day 3 — Kiosk Setup

1. Assign tablet device to kiosk URL (your Vercel domain)
2. Staff unlocks kiosk with their credentials
3. Verify students appear in search
4. Test: student enters PIN → check-in recorded → attendance visible in teacher view
5. Verify kiosk stays live for 4+ hours without locking

### Ongoing Operations

| Task | How |
|------|-----|
| Add new user | Admin → Invites → send email → user accepts → sets PIN |
| Change class schedule | Admin → Class Schedules → edit |
| Review attendance | Teacher page or Admin → Attendance |
| Backup data | Admin Database → Export JSON (do periodically) |
| Deploy updates | Push to `main` → auto-deploys → migrations run automatically |
| Rollback | Follow Rollback Plan above |
