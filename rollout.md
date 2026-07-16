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
| 3c | `seed-demo` command — runs `seed_complete_data()` for dev/staging. Only works when `ENVIRONMENT != production` | `app/cli.py` |
| 3d | `migrate-and-bootstrap` command — runs `alembic upgrade head` then `bootstrap`. Intended for Render start command | `app/cli.py` |
| 3e | Add entry point to `pyproject.toml` so commands work via `uv run ckb bootstrap` | `pyproject.toml` |

### Step 4: Remove Auto-Seed from Lifespan
| # | Task | Files |
|---|------|-------|
| 4a | Remove the `user_count == 0` auto-seed block from `main.py` lifespan (lines ~106–143) | `main.py` |
| 4b | Remove the `existing_tablet_role` / `existing_lite_admin_role` checks from lifespan (moved to bootstrap) | `main.py` |
| 4c | Keep rank tier seeding and `rank_tier_id` backfill in lifespan (these are safe, idempotent migrations) | `main.py` |
| 4d | Update Render start command to: `cd backend && uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT` | `render.yaml` |

### Step 5: Clean Up Seed Scripts
| # | Task | Files |
|---|------|-------|
| 5a | Keep `seed_complete_data.py` — rename to `seed_demo.py` for clarity | `seed_demo.py` |
| 5b | Remove `POST /admin/seed` endpoint (replaced by CLI `seed-demo` command) | `admin.py` |
| 5c | Keep admin Database tab: backup, restore, reset (reset now just drops + migrates, no auto-seed) | `database.py` |
| 5d | Update `reset_database` to run `alembic upgrade head` after dropping tables instead of `create_all` | `database.py` |

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
