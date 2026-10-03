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
- [ ] Complete Phase 5E deployed data integration recovery on physical devices.
- [ ] Validate teacher schedule, attendance, feedback, and comments on physical devices.
- [x] Add PWA manifest and install instructions.
- [x] Add installable app icons and mobile web-app metadata.
- [x] Add a service worker with static-assets-only caching.
- [x] Add visible offline status messaging and safe service-worker update handling.
- [ ] Add Capacitor projects after the web/PWA version is stable.

## Production Test Controls

- [ ] Use a clearly labelled test account.
- [ ] Identify test attendance and feedback records.
- [ ] Back up the production database before API, authentication, or schema changes.
- [ ] Record the Vercel and Render deployment versions before each release.
- [ ] Confirm the previous deployment can be restored.
- [ ] Verify production `COOKIE_SECURE=True` and `COOKIE_SAMESITE=None` for the cross-site Vercel/Render deployment.

## Required Smoke Tests

- [x] Web login and navigation without immediate logout on the reported phone and desktop.
- [ ] Web logout.
- [ ] Session refresh and expiry handling.
- [ ] Student schedule and attendance history.
- [ ] Student check-in.
- [ ] Teacher schedule and attendance management.
- [ ] Kiosk unlock, student selection, and kiosk lock.
- [ ] Admin access.
- [ ] Desktop browser layout.
- [ ] iPhone Safari layout.
- [ ] Android Chrome layout.

## Verification Checkpoint (2026-10-03)

- Local baseline passed: 159 backend tests with 77.90% coverage, 184 frontend tests, frontend lint with 0 errors, and a successful production build.
- Phase 3A physical-device authentication and workflow checks are complete. Phase 5 mobile API reliability work is the active follow-up phase.

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

## Phase 5E Verification Scope

- [ ] Capture a clean deployed iPhone baseline and record sanitized request outcomes.
- [ ] Identify and classify the first failing shared data request.
- [ ] Verify deployed API origin, CORS, cookies, CSRF, refresh, and service-worker freshness.
- [ ] Verify portal, weekly schedule, attendance, search, feedback, and comments with labelled data.
- [ ] Verify check-in Retry recovery and duplicate check-in behavior.
- [ ] Repeat the complete data-flow matrix after deployment and update the evidence record.

## Deliberately Deferred

- Service-worker caching of authenticated pages or API responses.
- Offline attendance writes and background sync.
- Offline attendance writes.
- Authentication storage changes.
- Database migrations for mobile-only features.
- Native camera, push notification, biometric, or deep-link integrations.
