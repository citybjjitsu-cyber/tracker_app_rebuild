# CKB Tracker Mobile App Plan

## Current Project Status

The current product is a responsive Next.js web application. It is not yet a PWA or a native Android/iOS application:

- No `manifest.webmanifest` or service worker has been added.
- Capacitor, iOS, and Android projects have not been added.
- Offline writes, push notifications, native secure storage, and native device integrations remain future work.
- The current mobile implementation work includes the responsive teacher schedule redesign.
- The student portal now has a focused mobile resilience pass with narrow-viewport coverage and visible retry states.
- Physical-device validation on iPhone and Android is still pending.

### Completed Mobile Foundation

The teacher schedule now has a shared, testable schedule layer in `ckb-tracker/src/lib/teacherSchedule.ts` and uses it from `ckb-tracker/src/app/teacher/page.tsx`:

- Monday-first weekly date calculation.
- Normalization of full day names and common abbreviations.
- Previous/next week navigation and date serialization.
- Two-column mobile schedule layout and seven-column desktop layout.
- Touch-friendly class selection while preserving the existing attendance flow.
- Focused Vitest coverage in `ckb-tracker/src/__tests__/teacher-schedule.test.ts`.

This work is behavior-preserving preparation. It does not add installability, offline behavior, native packaging, or changes to authentication/API contracts.

## Recommended Direction

Build the existing Next.js app as a mobile-first Progressive Web App (PWA) first, then package it with Capacitor for the Apple App Store and Google Play if store distribution is required.

This avoids rebuilding the teacher, student, admin, and check-in experiences in React Native while preserving the existing FastAPI API and authentication system.

## Phase 1: Define Mobile Scope

Prioritize these mobile workflows:

- Student login and profile
- Weekly class schedule
- Student check-in
- Attendance history
- Teacher attendance management
- Feedback and comments
- Password and PIN recovery
- Push notifications, if needed later

Keep the kiosk as a separate shared-device experience rather than mixing it into the personal mobile app.

## Phase 2: Mobile-First Web Foundation

- Audit every route at iPhone and Android widths.
- Create a shared mobile navigation pattern.
- Standardize responsive layouts, spacing, cards, forms, and touch targets.
- Add reliable loading, empty, retry, and offline states.
- Ensure mobile pages never silently hide API failures.
- Add physical-device testing for Safari and Chrome.

### Phase 2A: Student Portal Audit (Completed)

The first route-level mobile slice is complete:

- Student portal layout was validated at a narrow mobile viewport and a desktop regression viewport.
- Portal tabs, charts, attendance history, feedback, and comments retain usable narrow-screen layouts.
- Long comment content is allowed to wrap without creating page-level overflow.
- Portal data, comments, and feedback failures now expose visible user-facing states and retry or recovery actions.
- Playwright coverage was added for mobile overflow, tab navigation, and portal data retry behavior.

This phase used browser viewport validation only. Real iPhone and Android device testing remains a separate phase.

## Phase 3: Authentication Hardening

The current system uses FastAPI JWT authentication with secure cookies and CSRF protection. Validate this on:

- iPhone Safari
- Android Chrome
- Installed PWAs
- Capacitor WebViews

Add:

- Session-expiration handling
- Refresh and retry behavior
- Network error recovery
- Clear logout behavior
- No sensitive data in `localStorage`
- A documented strategy for native secure storage if Capacitor is introduced

### Phase 3A: Browser Session Stabilization (In Progress)

- The deployed API currently returns credentialed CORS headers for the Vercel frontend.
- Normal web API requests now share a single refresh request when access-token expiry causes concurrent 401 responses.
- A failed web refresh now clears the in-memory auth state instead of leaving the app in a misleading partially authenticated state.
- Cookie attributes and refresh behavior still require verification on physical iPhone Safari and Android Chrome.
- Cross-site production cookies now default to `SameSite=None` when `ENVIRONMENT=production`; the Render override must be checked so it does not force `Lax` for the current Vercel/Render deployment.
- A same-site custom API hostname remains the preferred long-term browser/PWA solution if a project domain is available.

This phase must be completed before PWA installability or Capacitor packaging. The native app will use a separate bearer-token adapter with Keychain/Keystore-backed refresh storage rather than relying on WebView cookies.

#### Phase 3A Verification Gate

After deployment, verify the following on the affected phone before marking this phase complete:

- The login response stores `access_token`, `refresh_token`, and `csrf_token` with the expected secure attributes.
- `/auth/me` and `/auth/refresh` send credentialed requests from the deployed frontend.
- A protected request after access-token expiry refreshes once and succeeds without showing the login screen.
- A failed refresh shows a clear session-expired state and does not loop.
- iPhone Safari and Android Chrome both retain the session through navigation, backgrounding, and reopening.

## Phase 4: PWA Support

Add:

- `manifest.webmanifest`
- App icons and splash metadata
- Install prompts or instructions
- A service worker for static shell assets
- Safe update handling
- Offline messaging

Initially keep API operations online-only. Do not cache attendance, PINs, profiles, or admin data.

## Phase 5: Mobile API Improvements

Before native packaging:

- Add consistent API error formats.
- Add schedule endpoints that return normalized day and date data.
- Add explicit loading and failure responses to the UI.
- Add idempotency protection for check-ins.
- Consider a dedicated weekly schedule response so every client uses the same grouping logic.
- Add backend tests for mobile-critical flows.

## Phase 6: Capacitor App Wrapper

If App Store and Play Store presence is desired:

- Add Capacitor around the existing frontend.
- Start with a thin wrapper using the existing web UI.
- Configure iOS and Android app identifiers, icons, splash screens, and permissions.
- Test cookies and sessions inside WKWebView and Android WebView.
- Add native capabilities only when justified:
  - Camera
  - Push notifications
  - Biometric unlock
  - Secure credential storage
  - Deep links

Create internal iOS and Android builds before submitting to the stores.

## Phase 7: Device Testing and Release

Test on real devices:

- Small iPhone
- Large iPhone
- Android phone
- Tablet
- Slow network
- Offline and reconnected network
- Dark and light mode
- Camera permissions
- Session expiration
- Rotation and keyboard behavior
- Accessibility and touch targets

Release first to a small teacher and student pilot, then publish broadly.

## Technology Recommendation

- **Now:** Responsive Next.js PWA
- **Store distribution:** Capacitor
- **Avoid initially:** React Native or Expo
- **Avoid currently:** Separate Swift and Kotlin apps

React Native would require rebuilding nearly every existing screen and interaction. It only becomes worthwhile if the mobile product later needs substantial offline functionality, Bluetooth or NFC hardware, deep native integrations, or a significantly different user experience.

## Main Risks

- Cookie authentication may behave differently in native WebViews.
- Cross-origin CORS and secure-cookie configuration must remain correct.
- Offline check-ins require idempotency and queued-write backend support.
- Sensitive attendance and PIN data must not be cached by a service worker.
- Kiosk security must remain isolated, with its staff token held only in memory.

## Production-Safe Delivery Path

The project currently has one shared production environment and no separate development or staging environment. There are no active users at present, so production can be used as a temporary controlled test environment. This reduces the risk to day-to-day operations, but every deployed change must still be treated as a production release because it can affect availability, data, authentication, or the live website.

### Before Implementation

- Create a feature branch for each mobile milestone.
- Confirm the current production deployment can be rolled back quickly.
- Back up the production database before authentication, API, or schema changes.
- Create a clearly labelled test account and test records for mobile testing.
- Record the current API, database schema, authentication, and kiosk behavior as release baselines.
- Add or update automated tests before changing shared API or authentication code.
- Use a production-like local database snapshot with secrets removed.

Because there are no active users, UI work and device testing can move faster than they would in a user-facing production system. Authentication, database, attendance, API, and service-worker changes should still be introduced one phase at a time and verified before continuing.

### During Development

- Prefer additive, backwards-compatible API changes.
- Keep mobile-only UI behind feature flags until it has been validated.
- Avoid changing existing response shapes used by the web, kiosk, or check-in pages.
- Make database migrations forward-compatible and non-destructive.
- Use the test account for all production mobile testing and clearly identify test attendance or other test records.
- Never cache authenticated API responses, attendance data, PINs, profiles, or admin data in the PWA.
- Keep Capacitor-specific code isolated from the production web bundle where possible.

### Release Order

1. Merge and deploy backwards-compatible backend changes.
2. Verify authentication, kiosk, check-in, teacher, and admin workflows.
3. Merge and deploy the web/PWA changes.
4. Test the deployed app on physical iPhone and Android devices.
5. Enable mobile features gradually using feature flags.
6. Build and distribute the Capacitor apps only after the web and API release is stable.

During this initial no-user period, the developer's device testing serves as the pilot. Before inviting staff or students, complete a final end-to-end smoke test and remove or clearly separate test data from operational records.

### Required Verification

- Run backend tests with the coverage threshold.
- Run frontend tests, lint, and production build.
- Run relevant Playwright end-to-end tests.
- Smoke-test login, logout, refresh, student check-in, teacher attendance, kiosk unlock, and admin access after deployment.
- Verify both desktop and mobile layouts after every shared component change.
- Confirm API errors produce visible retry states rather than silent empty screens.

### Rollback Plan

- Document the exact commit and deployment version for every release.
- Keep feature flags available to disable mobile behavior without another code deploy.
- Prepare rollback steps for both frontend and backend deployments.
- Do not roll back a database migration destructively; use a corrective migration instead.
- If a service worker is introduced, document cache invalidation and emergency update behavior.

If hosting permits it, add temporary Vercel preview deployments and a temporary Render preview service before making authentication, database, or service-worker changes. If separate environments remain unavailable, limit the first mobile milestones to isolated, additive frontend work and require explicit smoke testing before each production merge.

## First Milestone

Start with a mobile-first PWA audit and a shared schedule/data layer. Then install and test the app on physical iPhone and Android devices before adding native packaging.
