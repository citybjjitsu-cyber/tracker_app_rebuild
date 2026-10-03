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
- [ ] Audit check-in and recovery flows on physical devices.
- [ ] Validate teacher schedule, attendance, feedback, and comments on physical devices.
- [ ] Add PWA manifest and install instructions.
- [ ] Add a service worker with static-assets-only caching.
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
- Physical-device authentication and workflow checks remain open because iPhone Safari and Android Chrome evidence was not captured.

## Deliberately Deferred

- Service-worker caching of authenticated pages or API responses.
- Offline attendance writes.
- Authentication storage changes.
- Database migrations for mobile-only features.
- Native camera, push notification, biometric, or deep-link integrations.
