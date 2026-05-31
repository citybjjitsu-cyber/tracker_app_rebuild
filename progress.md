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

## Phase 2: Full Kiosk Mode (Future)

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

## Phase 3: Tablet User Deprecation (Future)

- Add migration guide for gyms using tablet user
- Admin setting: "Enable Kiosk Mode" toggle
- Optionally redirect `/check-in` → `/kiosk`
- Retire tablet role and seed account

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

### Still Needed (Next)
- Phase 1 implementation: PIN confirmation step on `/check-in` page

---

*Last Updated: May 31, 2026*
