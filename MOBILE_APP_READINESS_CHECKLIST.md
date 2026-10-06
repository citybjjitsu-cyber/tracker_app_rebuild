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

## Production Test Controls

- [ ] Use a clearly labelled test account.
- [ ] Identify test attendance and feedback records.
- [ ] Back up the production database before API, authentication, or schema changes.
- [ ] Record the Vercel and Render deployment versions before each release.
- [ ] Confirm the previous deployment can be restored.
- [x] Verify production `COOKIE_SECURE=True` and `COOKIE_SAMESITE=Lax` for the same-origin Vercel proxy deployment.

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

- `sw.js` precaches only the manifest, app icons, and favicon, then caches same-origin static assets and Next.js static bundles.
- Document navigations, API requests, authenticated responses, and non-GET requests bypass the worker.
- Obsolete static caches are removed during activation; an updated worker takes control and triggers one page reload.
- Offline status is visible in the app shell, but server-backed operations remain online-only.

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

- Frontend fix commit: `8e29baa`.
- Vercel: `NEXT_PUBLIC_API_URL` remains the Render API target and `NEXT_PUBLIC_API_PROXY=true` enables same-origin rewrites.
- Render: `COOKIE_SECURE=True`, `COOKIE_SAMESITE=Lax`, and the Vercel origin remains configured in `CORS_ORIGINS`.
- Validation result: login, protected analytics, attendance, teacher, check-in, and admin flows work on desktop and iPhone.

## Deliberately Deferred

- Service-worker caching of authenticated pages or API responses.
- Offline attendance writes and background sync.
- Offline attendance writes.
- Authentication storage changes.
- Database migrations for mobile-only features.
- Native camera, push notification, biometric, or deep-link integrations.

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
- [ ] Verify native login, refresh, logout, session expiry, background/reopen, and reinstall on real Android and iOS devices before internal distribution.
