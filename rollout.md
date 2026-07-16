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

| # | Task | Files |
|---|------|-------|
| 4a | Create `/news` page — public, no auth, feed of all published news | `app/news/page.tsx` |
| 4b | Make home page news items clickable + "View All News" link | `KioskLocked.tsx` |
| 4c | Add `/news` to public routes in AppLayout | `AppLayout.tsx` |

**Commit:** `feat: add public news page accessible without login`

---

## Phase 5: Rank/Degree Display Enhancement
**Branch:** `feature/rank-degree-display`

| # | Task | Files |
|---|------|-------|
| 5a | Backend: Add `rank_degree` and `rank_display_name` to `UserResponse` via RankTier join | `schemas.py`, `users.py` |
| 5b | Frontend: Add `rank_degree` and `rank_display_name` to `User` type | `types/index.ts` |
| 5c | Replace all `{user.rank} Belt` plain text with `<RankBadge rank={...} degree={...} />` | Multiple components |
| 5d | Update rank dropdowns to show full display names with degrees | `admin/page.tsx`, `teacher/page.tsx` |

**Commit:** `feat: include belt degree in rank display across all pages`

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

| # | Task | Files |
|---|------|-------|
| 7a | Add `POST /admin/users/{uuid}/toggle-active` endpoint (admin-only) | `admin.py`, `users.py` |
| 7b | Add activate/deactivate button per user in admin User Admin tab | `admin/page.tsx` |
| 7c | Filter inactive users from kiosk search and check-in name search | `users.py`, `kiosk.py` |
| 7d | Add "Show Inactive" filter toggle in admin User Admin tab | `admin/page.tsx` |
| 7e | Verify backup/restore database functionality, document issues | `database.py`, manual testing |

**Commit:** `feat: user deactivation/reactivation for admin with inactive user filtering`

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

---

## Verification Checklist (Per Phase)

After each phase is merged to `main`:

- [ ] Frontend builds and deploys to Vercel successfully
- [ ] Backend deploys to Render successfully
- [ ] No regressions in existing functionality
- [ ] Changed features verified manually on Vercel preview
- [ ] Backend tests pass (pytest, coverage ≥ 75%)
- [ ] Frontend tests pass (vitest, thresholds met)
