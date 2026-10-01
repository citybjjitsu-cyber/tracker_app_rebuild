# Mobile App Readiness Checklist

This checklist tracks low-risk preparation before the CKB Tracker mobile app is exposed to staff or students.

## Current Scope

- [x] Document the mobile app phases and production-only testing approach.
- [x] Keep kiosk behavior separate from personal mobile workflows.
- [x] Extract teacher schedule date and day normalization helpers for focused testing.
- [ ] Audit student portal layouts at iPhone and Android widths.
- [ ] Audit check-in and recovery flows on physical devices.
- [ ] Validate teacher schedule, attendance, feedback, and comments on physical devices.

## Production Test Controls

- [ ] Use a clearly labelled test account.
- [ ] Identify test attendance and feedback records.
- [ ] Back up the production database before API, authentication, or schema changes.
- [ ] Record the Vercel and Render deployment versions before each release.
- [ ] Confirm the previous deployment can be restored.

## Required Smoke Tests

- [ ] Web login and logout.
- [ ] Session refresh and expiry handling.
- [ ] Student schedule and attendance history.
- [ ] Student check-in.
- [ ] Teacher schedule and attendance management.
- [ ] Kiosk unlock, student selection, and kiosk lock.
- [ ] Admin access.
- [ ] Desktop browser layout.
- [ ] iPhone Safari layout.
- [ ] Android Chrome layout.

## Deliberately Deferred

- Service-worker caching of authenticated pages or API responses.
- Offline attendance writes.
- Authentication storage changes.
- Database migrations for mobile-only features.
- Native camera, push notification, biometric, or deep-link integrations.
