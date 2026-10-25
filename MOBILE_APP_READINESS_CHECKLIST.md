# Mobile App Readiness Checklist

This checklist tracks low-risk preparation before the CKB Tracker mobile app is exposed to staff or students.

## Current Scope

- [x] Document the mobile app phases and production-only testing approach.
- [x] Keep kiosk behavior separate from personal mobile workflows.
- [x] Extract teacher schedule date and day normalization helpers for focused testing.
- [x] Implement responsive teacher schedule layout and week navigation.
- [x] Add automated tests for teacher schedule normalization and week calculations.
- [x] Audit student portal layouts at representative iPhone and Android browser widths.
- [x] Add normal-web access-token refresh/retry handling with concurrent-request protection.
- [x] Verify the reported phone and desktop retain login while navigating between web-app pages.
- [x] Run the local backend/frontend test, lint, coverage, and production-build baseline.
- [x] Complete Phase 5E deployed data integration recovery on physical devices.
- [x] Validate teacher schedule, attendance, feedback, and comments on physical devices.
- [x] Add PWA manifest and install instructions.
- [x] Add installable app icons and mobile web-app metadata.
- [x] Add a service worker with static-assets-only caching.
- [x] Add visible offline status messaging and safe service-worker update handling.
- [x] Add Capacitor Android and iOS projects after the web/PWA version is stable.
- [x] Add role-aware mobile navigation to the check-in route.
- [x] Add safe-area spacing for mobile navigation, page content, and offline status.
- [x] Complete physical-device Phase 5F validation at 320/375/390/430px-equivalent widths.
- [x] Implement configurable timezone fallback using UTC timestamps, browser IANA timezone detection, and IANA daylight-saving rules.
- [ ] Set and verify `SITE_TIMEZONE` and `NEXT_PUBLIC_SITE_TIMEZONE` for each deployed environment, or explicitly approve browser fallback.
- [ ] Add and validate the Admin `Site Settings` tab for database-backed timezone, locale, and time-format configuration.

## Production Test Controls

- [ ] Use a clearly labelled test account.
- [ ] Identify test attendance and feedback records.
- [ ] Back up the production database before API, authentication, or schema changes.
- [ ] Record the Vercel and Render deployment versions before each release.
- [ ] Confirm the previous deployment can be restored.
- [x] Verify production `COOKIE_SECURE=True` and `COOKIE_SAMESITE=Lax` for the same-origin Vercel proxy deployment.
- [x] Verify the Vercel proxy preserves the `/admin` frontend page while forwarding only the admin API paths.

## Required Smoke Tests

- [x] Web login and navigation without immediate logout on the reported phone and desktop.
- [x] Web logout.
- [x] Session refresh and expiry handling.
- [x] Student schedule and attendance history.
- [x] Student check-in.
- [x] Teacher schedule and attendance management.
- [x] Kiosk unlock, student selection, and kiosk lock.
- [x] Admin access.
- [x] Desktop browser layout.
- [x] iPhone Safari layout.
- [x] Android Chrome layout.

## Verification Checkpoint (2026-10-04)

- Local baseline passed: 161 backend tests, 189 frontend tests, frontend lint with 0 errors, and a successful production build.
- Phase 3A physical-device authentication and workflow checks are complete.
- Phase 5E deployed data integration recovery passed on desktop and iPhone after the same-origin proxy deployment.

## Phase 4A Checkpoint (2026-10-03)

- Added `manifest.webmanifest`, 192px/512px app icons, standalone metadata, and browser-aware install guidance.
- Authenticated API data remains online-only; no service worker or API caching was added.
- Service-worker behavior and offline messaging are complete for the static shell.

## Phase 4B Checkpoint (2026-10-03)

- `sw.js` precaches only the manifest, app icons, and favicon, caches same-origin static assets, and fetches Next.js static bundles network-first with cached fallback.
- Document navigations, API requests, authenticated responses, and non-GET requests bypass the worker.
- Obsolete static caches are removed during activation; `/sw.js` is not cached, and an updated worker takes control and triggers one page reload.
- Offline status is visible in the app shell, but server-backed operations remain online-only.

## Phase 4C Theme Decision (2026-10-08)

- Initial mobile release uses the fixed CKB dark theme; light mode is not a supported release path.
- Admin-managed arbitrary theme JSON is removed from the active product surface.
- The frontend no longer depends on `/themes/active`; missing database themes must not affect app startup or kiosk operation.
- CSS variables remain the styling contract so a future approved theme catalog can be added without rewriting components.
- Future personal themes are deferred until a token audit, contrast review, catalog model, and per-user preference design are complete.
- Mobile navigation policy: all authenticated user roles return to `/portal` after check-in; kiosk/tablet mode remains a separate staff-controlled flow.

## Phase 5G: Kiosk Check-In Idempotency - Complete

- [x] Approve the attendance identity as `(gym_id, class_instance_id, user_uuid, attendance_date)`.
- [x] Add application-level resolution of gym and dated class-instance identity for all attendance creation paths.
- [x] Add a forward-only migration that backfills gym scope and replaces the old user/class/date uniqueness index.
- [x] Make kiosk confirmation distinguish newly created attendance from an already-present retry.
- [x] Audit production and development attendance data for duplicate `(gym_id, class_instance_id, user_uuid, attendance_date)` rows.
- [x] Reconcile migration-generated class-instance grouping and deploy the database uniqueness migration.
- [x] Make every attendance creation path concurrency-safe and consistently return `already_checked_in`.
- [x] Update kiosk selection and confirmation to distinguish new check-ins from retries and prevent duplicate submissions.
- [x] Verify duplicate retries do not create a second attendance record or make the class selectable again.
- [x] Run desktop and physical-mobile kiosk smoke tests, including pending-state blocking and teacher removal/re-entry.

## Phase 5A Checkpoint (2026-10-03)

- Bulk check-in retries return the existing attendance record in `already_present` and never create a second record.
- Duplicate responses include the stable `already_checked_in` code and `retryable: false` metadata.
- Single check-in duplicate failures expose `X-Error-Code` and `X-Retryable` headers.
- Backend attendance and frontend API tests cover retry and duplicate behavior.

## Phase 5B Checkpoint (2026-10-03)

- Added the normalized `GET /classes/weekly` response with Monday-first dates and seven day buckets.
- Moved the teacher schedule consumer to the weekly response and concrete `scheduled_date` values.
- Preserved the existing `/classes/` endpoint for kiosk, check-in, admin, and other consumers.

## Phase 5C Checkpoint (2026-10-03)

- Added a shared accessible retry state for mobile data failures.
- Kiosk class loading now exposes a retry action instead of silently rendering an empty result.
- Check-in schedule, student search, and attendance loading failures now show visible recovery states.
- Intentional empty states remain distinct from network failures.

## Phase 5E Verification Scope — Complete (2026-10-04)

- [x] Capture a clean deployed iPhone baseline and record sanitized request outcomes.
- [x] Identify and classify the first failing shared data request: protected cross-site cookie requests returned `401`.
- [x] Deploy the same-origin Vercel API proxy and verify first-party cookie transport.
- [x] Verify deployed API origin, CORS, cookies, CSRF, refresh, and service-worker freshness.
- [x] Verify portal, weekly schedule, attendance, search, feedback, and comments with labelled data.
- [x] Verify check-in Retry recovery and duplicate check-in behavior.
- [x] Repeat the complete data-flow matrix on desktop and iPhone after deployment.

### Phase 5E Deployment Record

- Frontend proxy fixes: `8e29baa`, `ce4f0fa`, and `7cf3f36`.
- Vercel: `NEXT_PUBLIC_API_URL` remains the Render API target and `NEXT_PUBLIC_API_PROXY=true` enables same-origin rewrites.
- Render: `COOKIE_SECURE=True`, `COOKIE_SAMESITE=Lax`, and the Vercel origin remains configured in `CORS_ORIGINS`.
- Validation result: login, protected analytics, attendance, teacher, check-in, and admin flows work on desktop and iPhone.
- Kiosk proxy safeguard: only explicit kiosk API endpoints are rewritten; `/kiosk/select` and `/kiosk/confirm` remain frontend routes.
- Admin proxy safeguard: only `/admin/invites` and `/admin/test-email` are rewritten; `/admin` remains a Next.js frontend route.
- Kiosk session safeguard: selected-user PIN verification does not overwrite the kiosk staff cookies or memory-only Bearer token.

### Kiosk Follow-up Verification - Complete

- [x] Deploy the kiosk rewrite/session fix to Vercel and Render.
- [x] Smoke-test unlock, student search, PIN confirmation, `/kiosk/select`, class loading, confirmation, attendance submission, and lock on desktop and a physical mobile browser.
- [x] Confirm the browser network trace shows `/kiosk/select` served by Vercel/Next.js rather than Render/Uvicorn.

### Invite List Follow-up

- [ ] Filter the pending invite API to unconsumed and unexpired records while retaining accepted/expired records for history and audit.
- [ ] Verify an accepted invite disappears from the pending list after password/PIN setup.
- [ ] Verify an expired invite disappears from the pending list without deleting its audit/history record.

## Deliberately Deferred

- Service-worker caching of authenticated pages or API responses.
- Offline attendance writes and background sync.
- Offline attendance writes.
- Authentication storage changes.
- Database migrations for mobile-only features.
- Native camera, push notification, biometric, or deep-link integrations.
- Database-backed Admin Site Settings for timezone, locale, and time format; the current fallback remains available until this is implemented.

## Phase 6B Kickoff

- [x] Create the initial table, endpoint, privacy, and migration scope matrix in `MOBILE_APP_PHASE_6B_SCOPE_MATRIX.md`.
- [x] Approve the gym/location model, gym-scoped membership, active-gym, and kiosk gym-selection policies.
- [x] Approve family, guardian, consent, teacher roster, feedback, conversation, content-sharing, retention, and audit policies.
- [x] Write cross-gym privacy and authorization test cases before Phase 6C migrations.
- [x] Produce the Phase 6C membership, scoped-role, active-gym, roster, and occurrence migration design.

## Phase 6C Design Kickoff

- [x] Create the authorization matrix and migration design in `MOBILE_APP_PHASE_6C_AUTHORIZATION_DESIGN.md`.
- [x] Add the local membership/scoped-role model and additive migration `b3c4d5e6f7a8`.
- [x] Add centralized membership and gym-role authorization helpers with transition support for the current global Admin role.
- [x] Add initial authorization unit coverage for active/pending memberships, scoped roles, platform roles, and primary memberships.
- [x] Add authenticated membership listing and active-gym context endpoints using `X-Gym-Id`.
- [x] Require explicit gym selection when an authenticated user has multiple active memberships.
- [x] Scope class listing, weekly schedules, class reads, creation, and updates to the active gym.
- [x] Scope attendance reads, writes, confirmation, cancellation, bulk actions, and kiosk status to the active gym.
- [x] Scope Teacher feedback reads to the active gym and current teacher access context.
- [x] Scope student feedback, Teacher feedback, and admin feedback reports to the active gym.
- [x] Bind kiosk API requests to the selected active gym and expose a gym selector after kiosk unlock.
- [x] Scope comments and replies to authenticated users and active-gym membership context.
- [x] Scope user listing, search, profile reads, creation, and CSV exports to active gym membership context.
- [x] Scope CSV imports, profile updates, photo uploads, photo deletion, and photo positioning to active gym membership context.
- [x] Add audited gym-scoped role assignment and revocation endpoints.
- [x] Scope personal dashboard stats, attendance trends, and admin attendance reports to the active gym.
- [x] Revoke affected user sessions when memberships or gym roles are suspended, deactivated, or revoked.
- [x] Add Platform/Gym Admin membership listing, addition, and status-management endpoints with audit logging.
- [x] Review and approve the membership, gym-scoped role, active-gym, kiosk, roster, and session-version model.
- [x] Write cross-gym privacy and authorization tests before adding runtime authorization.
- [x] Rehearse additive migrations and current-gym backfill against a production-like database copy.

## Phase 5F Implementation Checkpoint (2026-10-05)

- Added a shared mobile navigation drawer for authenticated routes and check-in.
- Added role-filtered navigation, accessible open/close controls, backdrop dismissal, and Escape-key dismissal.
- Added safe-area-aware check-in content spacing and offline-banner padding.
- Merged as commit `4b75d24` on `feature/mobile-app-foundation` and reviewed after merge.
- Automated frontend coverage passes; iPhone Safari, standalone PWA, Android Chrome, rotation, and keyboard validation remain manual follow-up work.

## Phase 5F Automated Validation Checkpoint (2026-10-06)

- Added component coverage for backdrop dismissal, permitted-route dismissal, and safe-area/touch-target classes in `mobile-navigation.test.tsx`.
- Passed 194 frontend Vitest tests, 161 backend tests, frontend lint with 0 errors, and a successful production build.
- Passed both mobile Playwright integration tests at a 375px viewport.
- Physical-device validation remains open: iPhone Safari/PWA, Android Chrome/PWA, rotation, keyboard behavior, kiosk smoke flow, and the 320/390/430px width matrix.

## Phase 5F Closeout (2026-10-06)

- [x] Physical mobile and desktop behavior verified after the Phase 5F navigation and safe-area changes.
- [x] Mobile navigation, offline/error messaging, responsive layouts, and role-appropriate routes verified as expected.
- [x] Kiosk unlock, student selection, and kiosk lock verified.
- [x] Phase 5F exit criteria satisfied; Capacitor wrapper work may begin as Phase 6.

## Phase 6A Checkpoint (2026-10-06)

- [x] Added Capacitor Android and iOS project scaffolding with app id `com.ckbtracker.app`.
- [x] Added a thin remote-web wrapper configuration with `CAPACITOR_SERVER_URL` override support.
- [x] Registered Keychain/Keystore-backed secure storage for the native session adapter.
- [x] Implemented native bearer-token login, refresh rotation, logout, and session-expiry handling.
- [x] Verified native login, refresh, logout, session expiry, responsive layouts, role-aware routes, kiosk flows, and recovery behavior on a physical phone and desktop browser.
- [x] Replaced horizontal schedule selectors with mobile-friendly day dropdowns on Check-in and Teacher Dashboard.

## Phase 6A Closeout (2026-10-06)

- [x] Physical phone validation completed successfully.
- [x] Desktop browser validation completed successfully.
- [x] Native authentication and secure-session behavior matched the implementation plan.
- [x] Check-in and Teacher Dashboard schedule views keep day selection and class content within a single mobile-width screen.
- [x] Phase 6A exit criteria satisfied.
- [ ] Complete platform-specific signing, release builds, and broader device-matrix validation before store distribution.

## Phase 8 Notification Plan

- [ ] Add server-side unread/read tracking for student comments and other notification events.
- [ ] Add an in-app notification count and notification area to the Student Portal.
- [ ] Link notifications to the relevant comment, feedback, or class action.
- [ ] Evaluate Capacitor push notifications after the in-app notification flow is reliable.
