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
- Kiosk proxy safeguard: only explicit kiosk API endpoints are rewritten; `/kiosk/select` and `/kiosk/confirm` remain frontend routes.
- Kiosk session safeguard: selected-user PIN verification does not overwrite the kiosk staff cookies or memory-only Bearer token.

### Kiosk Follow-up Verification

- [ ] Deploy the kiosk rewrite/session fix to Vercel and Render.
- [ ] Smoke-test unlock, student search, PIN confirmation, `/kiosk/select`, class loading, confirmation, attendance submission, and lock on desktop and a physical mobile browser.
- [ ] Confirm the browser network trace shows `/kiosk/select` served by Vercel/Next.js rather than Render/Uvicorn.

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
