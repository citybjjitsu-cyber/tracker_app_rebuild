# CKB Tracker Mobile App Plan

## Current Project Status

The current product is a responsive Next.js web application with PWA support and a thin Capacitor Android/iOS wrapper:

- PWA installability and static offline messaging are implemented; authenticated offline writes remain prohibited.
- Capacitor, iOS, and Android projects are present and use native secure storage for native sessions.
- Offline writes, push notifications, and most native device integrations remain future work.
- The current mobile implementation work includes the responsive teacher schedule redesign.
- The student portal is the default destination for every normal login role; Admin and Teacher dashboards remain available through navigation.
- The portal has mobile quick actions, stacked phone-friendly section tabs, a larger profile photo, and a clearly labeled logout action.
- Phase 6A is complete; data-model/privacy design, multi-gym isolation, account lifecycle, scheduling/attendance correctness, secure bulk onboarding, and full mobile functionality validation must now be completed before Phase 7 store release work.

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

### Phase 3A: Browser Session Stabilization (Web Flow Complete)

- The deployed API currently returns credentialed CORS headers for the Vercel frontend.
- Normal web API requests now share a single refresh request when access-token expiry causes concurrent 401 responses.
- A failed web refresh now rejects the affected request without globally clearing auth state from an unrelated API failure; explicit session-expiry handling remains a verification item.
- Auth initialization is guarded against a stale in-flight request overwriting a successful login during route transitions.
- The reported phone and desktop navigation flows were rechecked after deployment and are working without immediate logout.
- Cookie attributes, access-token expiry, and the full physical-device matrix still require explicit verification on iPhone Safari and Android Chrome.
- Cross-site production cookies now default to `SameSite=None` when `ENVIRONMENT=production`; the Render override must be checked so it does not force `Lax` for the current Vercel/Render deployment.
- A same-site custom API hostname remains the preferred long-term browser/PWA solution if a project domain is available.

The browser-session implementation is complete for the current web flow. PWA installability and Capacitor packaging are now complete; the native app uses a separate bearer-token adapter with Keychain/Keystore-backed refresh storage rather than relying on WebView cookies.

#### Phase 3A Verification Gate (Completed)

The remaining verification gate is:

- The login response stores `access_token`, `refresh_token`, and `csrf_token` with the expected secure attributes.
- `/auth/me` and `/auth/refresh` send credentialed requests from the deployed frontend.
- A protected request after access-token expiry refreshes once and succeeds without showing the login screen.
- A failed refresh shows a clear session-expired state and does not loop.
- iPhone Safari and Android Chrome both retain the session through navigation, backgrounding, and reopening.

#### Verification Checkpoint (2026-10-03)

- The local automated baseline passed: 159 backend tests at 77.90% coverage, 184 frontend tests, frontend lint with 0 errors, and a successful production build.
- Physical iPhone Safari and Android Chrome verification, deployed cookie inspection, refresh behavior, logout, and session-expiry handling were completed for the current web flow.
- The Phase 3A gate is closed. PWA and Capacitor work were completed in later phases; store signing and release validation remain.

## Phase 4: PWA Support

Add:

- `manifest.webmanifest`
- App icons and splash metadata
- Install prompts or instructions
- A service worker for static shell assets
- Safe update handling
- Offline messaging

Initially keep API operations online-only. Do not cache attendance, PINs, profiles, or admin data.

### Phase 4A: PWA Installability Foundation (Completed)

- Add the web app manifest and installable app icons.
- Add standalone display, theme metadata, safe start URL, and iOS web-app metadata.
- Provide browser-aware install guidance without caching authenticated data.
- Validate install and launch behavior on supported mobile browsers.

### Phase 4B: Static Shell and Network Status (Completed)

- Register a versioned service worker from the app shell.
- Cache only same-origin static assets; fetch Next.js static bundles network-first with cached fallback so build-time API configuration cannot remain stale after deployment.
- Never intercept document navigations, API requests, authenticated responses, or writes.
- Remove obsolete static caches during activation and reload once after an update takes control.
- Do not cache `/sw.js`, allowing the browser to detect worker version changes promptly.
- Show a visible offline status message while preserving online-only API behavior.

Offline attendance writes, authenticated page caching, API caching, and background sync remain deliberately deferred.

### Phase 4C: Stable Mobile Visual System (Current)

- Use one fixed CKB-branded dark theme for the initial phone app release.
- Remove the admin-managed arbitrary CSS/JSON theme editor from the mobile-facing product; do not make `/themes/active` a required frontend request.
- Keep the CSS variable/token layer and the backend theme tables temporarily for compatibility and rollback, but treat the global `WebsiteTheme` APIs as dormant until a replacement is designed.
- Remove light-mode controls from the active product until every component has been audited for token usage and contrast. Do not advertise light-mode support in device test criteria.
- Keep kiosk, student, teacher, and admin surfaces on the same fixed theme so screenshots, support instructions, and device testing remain predictable.
- Use `/portal` as the single authenticated mobile home: students, teachers, and admins return there after check-in and normal login. Desktop-only teacher/admin routes may remain available, but mobile navigation should not vary by role.

#### Future theme personalization (deferred)

- Reintroduce personalization as a small, code-defined catalog of approved themes rather than arbitrary admin-entered CSS JSON.
- Store a stable theme identifier (for example `default-dark`, `ocean`, or `forest`) separately from theme token definitions.
- Start with local device preference, then persist the selected identifier in user profile preferences so it can sync across devices.
- Keep kiosk mode on the fixed branded theme even if personal themes are later available in the phone app.
- Add admin controls only for enabling/disabling approved catalog entries; admins should not edit raw CSS values.
- Before reintroducing light mode, audit all hard-coded colors, component states, images, charts, dialogs, and contrast requirements.

## Phase 5: Mobile API Improvements

Before native packaging:

- Add consistent API error formats.
- Add schedule endpoints that return normalized day and date data.
- Add explicit loading and failure responses to the UI.
- Add idempotency protection for check-ins.
- Consider a dedicated weekly schedule response so every client uses the same grouping logic.
- Add backend tests for mobile-critical flows.

### Phase 5A: Check-In Reliability and API Contract (Completed)

- Treat `(user_uuid, class_id, attendance_date)` as the natural idempotency key for check-ins.
- Return existing attendance records for duplicate bulk submissions instead of creating another record.
- Add stable duplicate error codes and retryability metadata to bulk and single check-in responses.
- Preserve the existing response shape and attendance workflow for web, kiosk, and teacher clients.
- Add backend and frontend coverage for duplicate retries and non-retryable duplicate errors.

Concurrent-write database constraints and offline queued writes remain deferred until a dedicated data-migration phase.

### Phase 5B: Normalized Weekly Schedule (Completed)

- Add `GET /classes/weekly` with a Monday-first week range and all seven day buckets.
- Normalize common day-name abbreviations on the backend.
- Return each class with its concrete `scheduled_date` so clients do not duplicate date grouping logic.
- Migrate the teacher mobile schedule to the shared weekly response while preserving attendance selection behavior.
- Keep the existing class-list endpoint available for non-schedule consumers during migration.

### Phase 5C: Mobile State and Retry Audit (Completed)

- Add a shared retry state with accessible error messaging and a touch-friendly retry action.
- Surface class-loading failures in the kiosk selection flow instead of silently showing an empty schedule.
- Surface schedule, student search, and attendance-loading failures in the authenticated check-in flow.
- Preserve intentional empty states such as no classes today and no search results.
- Keep server-backed operations online-only and avoid retrying non-idempotent writes automatically.

### Phase 5D: Mobile API Integration Verification (Local Coverage Complete; Deployed Gate Open)

- Add browser-level mobile-width coverage for the normalized teacher schedule response.
- Verify a schedule API failure produces a visible retry and a successful recovery.
- Keep the test fixtures aligned with the bulk check-in response contract.
- Maintain a production verification checklist for schedule, check-in, duplicate retry, and session flows without storing credentials.

Local Playwright coverage is complete. The deployed-device gate remains open until the live HTTPS application is tested on a physical phone.

### Phase 5E: Deployed Data Integration Recovery (Completed)

The physical-device review identified a release blocker: the application shell, authentication, PWA installation, logout, and offline warning work, but live portal, schedule, attendance, and other data requests do not consistently load. Resolve this before further native packaging or broad UI refinement.

Observed findings that this phase must address:

- The student portal structure renders, but dashboard, attendance, and related data do not load.
- Portal and other pages show reload/connection error states even though authentication succeeds.
- Classes are missing from their expected days in schedule views.
- Feedback and comments render structurally, but cannot yet be validated with real data.
- Check-in shows an attendance-loading error, and its Retry action does not recover.
- General data loading is unreliable across more than one page, indicating a shared integration problem is likely.

#### 5E.0 Execution order and scope control

Perform this phase in the following order. Do not begin the layout phase, Capacitor work, or broad component refactoring while the shared data failure is unresolved.

1. Capture evidence from one clean deployed iPhone session.
2. Identify the first failing shared request and classify the failure.
3. Verify deployment configuration and authentication transport.
4. Verify endpoint availability, response contracts, and test data.
5. Fix the smallest shared cause before making endpoint-specific changes.
6. Repair endpoint-specific data or retry behavior only where evidence requires it.
7. Deploy once, clear stale PWA state, and repeat the complete data-flow matrix.
8. Update the plan, readiness checklist, progress log, and deployment record with the outcome.

Keep each fix independently testable. If the investigation reveals separate backend, cookie, and UI defects, split them into separate implementation commits or follow-up phases rather than combining unrelated changes.

#### 5E.1 Establish a clean deployed test session

- Use the deployed HTTPS URL on the iPhone, not localhost.
- Record the frontend deployment identifier, backend deployment identifier, iPhone model, iOS version, and Safari version.
- Close existing tabs, clear the deployed site data, and unregister the installed service worker once before taking baseline measurements.
- Log in with the labelled test account and confirm that `/auth/me` succeeds before testing page-specific data.
- Capture pass/fail outcomes and status categories for `/auth/me`, dashboard statistics, attendance, `/classes/`, `/classes/weekly`, student search, feedback, and comments.
- Record only route names, status categories, timestamps, deployment versions, and sanitized error text; never record credentials, tokens, PINs, or student data.

The first clean run is diagnostic, not a pass/fail release sign-off. Preserve enough evidence to compare the result after each fix.

#### 5E.2 Classify the first failing request

Use the browser network evidence and backend logs to classify the first failure before changing code:

- **No request appears:** inspect the frontend API base URL, route gating, client-side effect conditions, and stale service-worker bundle.
- **`401` or `403`:** inspect cookie presence, `withCredentials`, secure/SameSite attributes, refresh behavior, CSRF requirements, token expiry, and role authorization.
- **CORS or preflight failure:** inspect the exact deployed frontend origin, allowed origins, allowed headers, credential support, and HTTPS scheme.
- **`404`:** compare the deployed frontend route with the deployed backend route, including trailing slashes and the new weekly schedule path.
- **`422`:** compare query parameters, request bodies, and date formats with the current Pydantic/API contract.
- **`5xx`:** inspect backend logs, database connectivity, missing seed data, migrations, and the specific request correlation ID.
- **`200` with empty or malformed data:** inspect response shape, active/current filters, day-name normalization, date/time zones, and client mapping.
- **Correct response but broken screen:** inspect client state transitions, rendering conditions, stale state, and error handling separately from the API.

Do not infer a backend problem from a generic UI warning alone; confirm the request and response first.

#### 5E.3 Verify deployment configuration and authentication transport

- Confirm the deployed frontend API base URL points to the intended backend.
- Confirm the production frontend origin is allowed by backend CORS configuration.
- Confirm credentialed requests, secure cookies, SameSite settings, CSRF handling, and refresh behavior work across the deployed origins.
- Confirm the deployed frontend and backend versions are compatible with the current schedule and attendance response contracts.
- Confirm the backend is serving the expected version and that the frontend bundle references the expected API base URL.
- Confirm a refresh after access-token expiry either succeeds through the refresh flow or produces one clear session-expired state without repeated requests.
- Confirm the service worker is serving the current static bundle after deployment; clear the installed PWA site data again if the bundle version is stale.

If all data endpoints fail in the same way, fix this section's shared configuration/authentication cause first. Do not add individual Retry buttons as a substitute for fixing a broken session or API origin.

#### 5E.3.1 Same-origin browser transport remediation

The deployed Vercel-to-Render browser flow currently returns `401` for `/auth/me`, `/auth/refresh`, and protected data requests while public dashboard responses succeed. This indicates that cross-site cookie transport is not reliable enough for the mobile app. Remediate it with a same-origin Vercel proxy before treating authentication as production-ready:

- Keep `NEXT_PUBLIC_API_URL` as the Render backend target for the Vercel rewrite destination.
- Add rewrites for every browser API route, including auth, attendance, classes, dashboard, users, roles, feedback, comments, themes, database, uploads, and related resources. Kiosk rewrites must be explicit API endpoint paths; a broad `/kiosk/:path*` rewrite collides with the frontend `/kiosk/select` and `/kiosk/confirm` pages.
- Set `NEXT_PUBLIC_API_PROXY=true` in Vercel so the browser API client uses relative paths while Vercel forwards requests to Render.
- Keep `withCredentials`/`credentials: 'include'` enabled for all cookie-authenticated requests.
- Preserve `/auth/refresh` as the browser-visible path so the refresh cookie path remains valid.
- Update the frontend CSP to allow same-origin API requests and the chosen font source.
- After the proxy is deployed, change Render `COOKIE_SAMESITE` from `None` to `Lax`; keep `COOKIE_SECURE=True` and the existing JWT secret.
- Do not cache authenticated API responses or service-worker data.
- Preserve kiosk session ownership: `/kiosk/verify-pin-for-user` validates the selected student's PIN without issuing student auth cookies or replacing the memory-only kiosk staff token.

Verify the remediation in a fresh browser session: login returns cookies, `/auth/me` succeeds after reload, refresh succeeds, attendance/admin requests are authenticated, logout clears the session, and the same flow works in the installed iPhone PWA.

#### 5E.4 Verify endpoint contracts and labelled data

After shared transport succeeds, validate each endpoint in dependency order:

1. **Identity:** `/auth/me` returns the expected test user and roles.
2. **Portal core:** dashboard statistics, attendance history, and attendance trend return valid data.
3. **Schedule:** `/classes/weekly` returns seven day buckets, correct dates, expected classes, and stable `scheduled_date` values.
4. **Check-in attendance:** the selected user's attendance request returns a valid list, including an empty list when no records exist.
5. **Student search:** search returns the expected labelled test user and distinguishes no results from a failed request.
6. **Feedback:** pending/history data loads or shows a truthful empty state when no test records exist.
7. **Comments:** feed data loads or shows a truthful empty state when no test comments exist.

For the missing-classes issue, compare the database record's active flag, day value, time value, effective date, and timezone with the normalized weekly response. Confirm that the backend, rather than each client, owns day/date grouping.

#### 5E.5 Restore data flows and repair retry behavior

- Fix the smallest root cause identified by the network and deployment evidence.
- Verify student portal statistics, attendance history, feedback, and comments load with labelled test data.
- Verify the weekly schedule populates the correct classes under each day.
- Verify check-in attendance loads, Retry makes a new request for the same user, clears the prior error state, and displays the recovered result.
- Verify Retry does not use stale user/class state, trigger an infinite loop, or submit a write operation.
- Verify successful check-in works, and a repeated check-in returns the existing record without duplication.
- Verify temporary network failure, expired session, empty data, and server failure produce distinct user-facing states.
- Add or update automated coverage for any discovered regression before closing the phase.

#### 5E.6 Deployment and recheck sequence

After implementation:

1. Run backend tests, frontend tests, lint, build, and mobile Playwright coverage.
2. Deploy the smallest complete fix set.
3. Confirm the deployed frontend and backend versions.
4. Clear the iPhone's installed PWA/site data only if needed to remove an old service-worker bundle.
5. Repeat identity, portal, schedule, attendance, search, feedback, and comments checks.
6. Repeat the failed-attendance Retry scenario.
7. Repeat the duplicate check-in scenario with the labelled test record.
8. Record evidence and close only the checklist items directly observed.

#### 5E.7 Exit criteria

- All required deployed data requests return expected status codes and response shapes.
- The iPhone can load portal, schedule, attendance, feedback, and comments data.
- Check-in Retry recovers from a temporary failure.
- Duplicate check-ins remain non-retryable and do not create duplicate records.
- Authenticated browser requests remain first-party through the production proxy and no longer depend on cross-site cookie delivery.
- The deployed-device verification checklist is updated with evidence and the remaining risk is zero or explicitly accepted.

Phase 5E closed on 2026-10-04 after the same-origin proxy deployment and desktop/iPhone data-flow verification. The kiosk proxy collision was fixed on 2026-10-08; production kiosk smoke testing remains tracked as a release checklist item.

### Phase 5F: Mobile Navigation and Safe-Area Layout (Implementation Complete)

Begin only after Phase 5E data flows are healthy. This phase addresses the physical-device layout findings without changing the API contract. The implementation is complete and merged; physical-device release validation remains open in the readiness checklist.

Observed layout issues to resolve:

- The check-in page has no hamburger/sidebar control for reaching other permitted pages.
- The top navigation/tab control collides with the date and is effectively unselectable.
- The offline warning is partly hidden beneath the phone's top/status area.
- The header and top controls do not reserve enough vertical space on a narrow iPhone viewport.

#### 5F.1 Audit current route and role behavior

- List the pages each role is allowed to reach from check-in: student, teacher, admin, and tablet/kiosk.
- Decide whether check-in should use the existing full Sidebar, a smaller mobile navigation drawer, or a dedicated role-aware mobile menu.
- Keep kiosk routes isolated from staff/student navigation and do not expose dashboard links in the kiosk flow.
- Confirm the navigation behavior for authenticated and unauthenticated check-in states before editing shared layout code.

#### 5F.2 Establish one mobile header contract

- Create one mobile header region with a predictable height and stacking order.
- Reserve separate slots for menu/back control, page title, date/context, and optional actions.
- Give every interactive control a minimum touch target of approximately 44px.
- Prevent date text and tabs from sharing the same horizontal space at 375px.
- Avoid absolute positioning for controls whose text can grow or wrap.

#### 5F.3 Apply safe-area and banner spacing

- Add top padding based on `env(safe-area-inset-top)` for installed iOS PWA mode and Safari.
- Ensure the header's normal flow height includes the safe-area inset rather than overlaying content.
- Anchor offline, Retry, and error banners below the header's layout boundary.
- Verify banners remain readable when the iPhone status bar, notch, or Dynamic Island is present.
- Confirm banners do not cover primary actions or prevent scrolling.

#### 5F.4 Implement check-in navigation

- Add the role-aware mobile menu or drawer to check-in.
- Provide a visible close action, backdrop dismissal, Escape-key support where applicable, and accessible labels.
- Preserve the existing back action where it is useful, but do not require users to discover it to reach other pages.
- Close the menu after navigation and preserve the current session state.
- Confirm that menu visibility does not alter kiosk security or expose kiosk staff tokens.

#### 5F.5 Validate the layout in sequence

1. Test the raw responsive browser view at 320px, 375px, 390px, and 430px widths.
2. Test Safari in portrait with the browser chrome visible.
3. Test the installed PWA in standalone mode.
4. Test with the offline banner visible.
5. Test with a long error message and a long class/date label.
6. Test keyboard focus, screen-reader labels, and touch target reachability.
7. Test portal, teacher, and check-in navigation for each permitted role.
8. Repeat the same flows after rotating the phone and after reopening the PWA.

#### 5F Exit criteria

- The check-in navigation control is visible, reachable, and does not collide with the date or header.
- Offline and error messages are fully visible below the safe-area inset.
- No horizontal overflow occurs at the smallest supported phone width.
- Portal, teacher, and check-in navigation remains role-appropriate.
- The same physical-device smoke flows pass after the layout changes.

#### 5F.6 Automated validation checkpoint (2026-10-06)

- Added automated coverage for mobile navigation backdrop dismissal, permitted-route dismissal, and safe-area/touch-target contracts.
- Passed 194 frontend tests, 161 backend tests, frontend lint with 0 errors, production build, and both mobile Playwright integration tests at 375px.
- Phase 5F remains open until the physical-device matrix, kiosk smoke flow, rotation, keyboard behavior, and Android Chrome/PWA checks are observed and recorded.

#### 5F.7 Closeout (2026-10-06)

- Physical mobile and desktop behavior was verified after the navigation and safe-area changes.
- Mobile navigation, offline/error messaging, responsive layouts, role-aware routes, and kiosk flows behaved as expected.
- Phase 5F exit criteria are satisfied. Capacitor wrapper planning is the next phase.

## Phase 6: Capacitor App Wrapper

If App Store and Play Store presence is desired:

### Phase 6A: Thin Wrapper and Native Session (Complete)

- Capacitor Android and iOS projects are present under `ckb-tracker/android/` and `ckb-tracker/ios/`.
- The app id is `com.ckbtracker.app` and the display name is `CKB Tracker`.
- The wrapper loads the deployed Vercel app by default and accepts `CAPACITOR_SERVER_URL` for local device testing.
- Keychain/Keystore-backed storage is registered through `@aparajita/capacitor-secure-storage` and exposed through `src/lib/nativeSessionStorage.ts`.
- Native login, bearer authorization, refresh rotation, logout, and session-expiry handling are implemented without changing browser cookie authentication.
- Native authentication, responsive layouts, role-aware routes, kiosk flows, recovery behavior, and the selected-day schedule views were tested successfully on a physical phone and desktop browser.
- Check-in and teacher schedules use full-width day dropdowns instead of horizontally scrolling day selectors, keeping all day choices accessible on small screens.

Phase 6A exit criteria are satisfied. Platform-specific store signing, release builds, and broader device-matrix validation remain Phase 7 release work.

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

### Phase 6B: Data Model and Privacy Design Gate (Required Before Migration)

Before changing the deployed database or importing a large member base, document the ownership, privacy, and lifecycle rules for every important record. Decide whether the current `gym_locations` table represents a tenant, a physical location, or both; if one organisation can have multiple locations, introduce separate organisation/gym/location concepts before data is migrated.

#### 6B.1 Scope and privacy inventory

- Classify every table and endpoint as platform-wide, organisation-wide, gym-scoped, user-scoped, guardian-scoped, or public.
- Ensure news, themes, rank systems, terms, targets, kiosk settings, invites, reports, uploads, feedback, comments, and exports have an intentional scope.
- Define separate response views for self, student directory, teacher management, gym admin, and platform admin data.
- Minimize email addresses, profile photos, comments, identifiers, and lifecycle fields returned to ordinary users.
- Protect uploaded photos and exports with authorization or signed access rather than relying on public file paths.
- Define data retention, correction, anonymization, account deletion, audit retention, and legal-hold rules.

#### 6B.2 Family, guardian, and consent policy

- Decide whether students are separate people from login accounts so a guardian can manage multiple dependents.
- Define guardian relationships, dependent visibility, emergency contacts, pickup permissions, consent versions, and consent revocation.
- Decide whether minors can have independent logins and which actions require a guardian.
- Include the guardian/dependent path in invitations, portal access, attendance, comments, notifications, and account recovery.

#### 6B.3 Exit criteria

- Every table and protected endpoint has a documented scope and privacy owner.
- The organisation/gym/location model, family policy, retention policy, and account lifecycle states are approved before migration.
- Cross-gym and cross-user privacy tests are written before new membership data is imported.

### Phase 6C: Multi-Gym Data Isolation and Scoped Roles (Required Before Onboarding)

Before importing or inviting a large member base, establish gym-scoped access control. A user identity remains global, but their membership and permissions must be evaluated separately for each gym. This supports users who are teachers at one gym and students at another without exposing teacher or administrative data across gyms.

#### 6C.1 Tenant and membership model

- Decide whether the current `gym_locations` table represents an independent gym or whether the model needs separate organisation/gym and physical-location entities.
- Add a `gym_users` membership table linking each user to an allowed gym with membership status, primary-gym flag, effective/end dates, and audit timestamps.
- Add gym-scoped role assignments through a `gym_user_roles` table, or an equivalent gym-scoped extension of `user_roles`.
- Add unique constraints preventing duplicate active memberships and duplicate active role assignments.
- Backfill all existing users, roles, classes, schedules, and related records into the current gym without changing existing behaviour.

#### 6C.2 Authorization and request context

- Require every authenticated request to operate within a server-validated gym context; never trust a client-supplied gym ID by itself.
- Allow a user with multiple memberships to select or switch gyms, but only among gyms assigned to that user.
- Recalculate permissions after every gym switch so a Teacher in one gym becomes a Student, or another permitted role, in a different gym.
- Scope classes, schedules, attendance, feedback, comments, invites, imports, reports, and admin actions to the active gym.
- Distinguish platform-level administration from gym-level administration and keep Admin controls unavailable in the mobile app.
- Preserve kiosk isolation and ensure kiosk staff tokens cannot be used to access another gym.

#### 6C.3 Migration and verification

- Create and rehearse forward-only Alembic migrations against a production-like database copy before touching Render.
- Back up the deployed database and record the current schema, user roles, gym records, and authorization behaviour.
- Deploy additive schema changes first, backfill the current gym, then enable scoped authorization behind a controlled feature flag where practical.
- Add backend tests proving cross-gym users can see only the data allowed by their active gym role, including teacher/student role changes between gyms.
- Add frontend and mobile tests for gym selection, switching, session refresh, logout, and blocked cross-gym URLs or API requests.
- Verify existing single-gym users and kiosk flows continue to work during and after migration.

#### 6C.4 Exit criteria

- Every existing user has an explicit gym membership and the current production data remains intact.
- Every role-sensitive API endpoint enforces the active gym membership and gym-scoped role server-side.
- A multi-gym test user can safely be a Teacher in one gym and a Student in another, with no cross-gym data leakage.
- Migration, backfill, authorization, mobile switching, and regression tests pass before bulk onboarding begins.
- Phase 6C is signed off before importing or inviting the wider member base.

### Phase 6D: Account Lifecycle, Sessions, and Family Access (Required Before Onboarding)

Implement the approved identity and lifecycle rules before inviting users. Keep the person’s identity global, but make memberships, roles, account status, sessions, and family access explicit and gym-aware.

#### 6D.1 Account lifecycle

- Replace the single active/inactive assumption with explicit states such as `pending`, `invited`, `active`, `suspended`, `deactivated`, and `archived`.
- Record who changed the state, when, why, and which gym or organisation the change applies to.
- Add credential/session versioning so deactivation, password reset, PIN reset, role removal, or gym removal can force existing mobile sessions to log out.
- Add device/session visibility and revocation for native mobile installations without exposing tokens.
- Define account merge, duplicate identity, email change, reactivation, and anonymization rules.

#### 6D.2 Exit criteria

- A deactivated or removed member cannot continue using an existing browser or native session.
- Password/PIN changes and role changes take effect on all active devices.
- Guardian, dependent, consent, recovery, and account-state tests pass for each supported user type.

### Phase 6E: Scheduling, Attendance, and Historical Correctness (Required Before Mobile Sign-Off)

Make schedules and attendance reliable across multiple gyms, devices, time zones, and concurrent requests before relying on the mobile app for operational records.

#### 6E.1 Schedule model

- Store an IANA timezone and local operating settings for each gym or location.
- Replace free-form schedule assumptions with validated local start time, duration, recurrence, concrete class instances, and UTC timestamps.
- Support cancellations, reschedules, holidays/blackout dates, instructor assignments, capacity, and future enrollment rules where required.
- Ensure weekly schedule APIs derive dates from the selected gym timezone rather than the server timezone.

#### 6E.2 Attendance model

- Add database-enforced uniqueness for the intended attendance identity, preferably based on gym, class instance, student, and attendance date.
- Require client idempotency keys and return the canonical existing record for safe retries.
- Record source, device, check-in/check-out time, actor, correction reason, and status transitions.
- Preserve correction and cancellation history instead of relying on destructive deletion.
- Snapshot class name, points, instructor, and relevant gym settings so historical reports do not change when configuration changes.
- Remove or secure write paths that bypass duplicate protection, including direct attendance operations.

#### 6E.3 Exit criteria

- Concurrent kiosk, teacher, and mobile requests cannot create duplicate attendance.
- Timezone, daylight-saving, cancellation, reschedule, and date-boundary tests pass for every supported gym.
- Reports correctly distinguish pending, confirmed, corrected, cancelled, and historical attendance.

### Phase 6F: Audit, Reporting, Notifications, and Retention (Required Before Public Rollout)

Add the operational records needed to manage a multi-gym mobile product safely. The first store release can remain online-only, but the data model should make future notifications, reporting, and device support possible without exposing sensitive information.

#### 6F.1 Structured audit and reporting

- Replace free-form audit details with structured, append-only events containing gym scope, actor, role, request ID, resource, action, result, source device, and redacted before/after values.
- Write audit events transaction-safely for role changes, imports, invitations, exports, sensitive reads, attendance corrections, account changes, and authorization failures.
- Enforce gym-scoped report filters server-side and require bounded date ranges, pagination, and export authorization.
- Snapshot historical class, points, instructor, timezone, and gym configuration values used by reports.
- Audit report generation and exports, and define retention rules for operational and audit records.

#### 6F.2 Notifications and device records

- Add in-app notification records with gym scope, recipient, read/seen timestamps, deep-link target, and sensitive-data-safe content.
- Add notification preferences, quiet hours, delivery attempts, and an outbox or equivalent retry mechanism.
- Add a device-installation model for future push tokens, app version, platform, last-seen time, and revocation; do not put sensitive student details in push payloads.
- Revoke device registrations and notification delivery when a user logs out, is deactivated, or loses gym access.

#### 6F.3 Online-only and future offline boundary

- Keep attendance and other authenticated writes online-only for the first public release unless a tested sync model exists.
- If offline writes are later introduced, require operation IDs, idempotency keys, server cursors, conflict rules, device identity, encryption, and explicit tenant-switch handling.

#### 6F.4 Exit criteria

- Sensitive mutations, reads, exports, invitations, and role decisions have durable, gym-scoped audit records.
- Reports cannot cross gym boundaries and preserve historical meaning after schedules or points change.
- Notifications and device records have privacy, revocation, and retention behaviour documented and tested.
- The first release explicitly communicates online-only behaviour rather than implying unsupported offline attendance.

### Phase 6G: Admin Bulk Invite Onboarding (Required Before Store Accounts)

Before creating or configuring Google Play Console or Apple App Store Connect accounts, add a controlled bulk-onboarding flow to the Admin web dashboard. This supports an existing member base without weakening the current invite security model: imported users remain pending until reviewed, and each user still creates their own password and kiosk PIN through a one-time email invite.

#### 6G.1 CSV import and review

- Accept a CSV containing required `first_name`, `last_name`, and `email` fields.
- Support optional `rank`, `nickname`, and gym/location fields where those values are already part of the account model.
- Require a gym assignment for every imported user and validate that the importing Admin is allowed to onboard users into that gym.
- Never accept passwords, PINs, invite tokens, access tokens, or other secrets in the CSV.
- Validate required fields, email format, supported rank values, gym scope, and allowed roles before creating anything.
- Match existing users by stable identity rules, flag duplicates and ambiguous matches, and distinguish new users from existing pending or active users.
- Show a dry-run preview with valid rows, warnings, errors, duplicate matches, and the actions that will occur.
- Require an Admin confirmation before accounts are created or invitation emails are sent.

#### 6G.2 Safe account creation and invitations

- Create new members in a `Pending` or equivalent inactive onboarding state with no password or PIN set.
- Default imported accounts to the `Student` role; require explicit privileged confirmation for Teacher or Admin roles.
- Preserve existing active users and avoid overwriting profile, role, rank, or access data without a separate confirmation.
- Reuse the existing one-time, expiring email invite flow so each user sets their own password and PIN.
- Send invitations in controlled batches with rate limiting and a clear result for every row.
- Support resend, expiry, cancellation, and recovery for pending invitations without creating duplicate accounts.

#### 6G.3 Admin management and audit trail

- Display per-user onboarding status: imported, matched, pending review, invited, delivered or failed, accepted, expired, resent, active, or deactivated.
- Allow Admins to retry failed deliveries and resend expired invites without re-importing the whole file.
- Record who imported, approved, invited, resent, accepted, or deactivated each account and when the action occurred.
- Keep the feature available only in the Admin web dashboard; do not expose bulk onboarding or Admin controls in the mobile app.
- Enforce gym/tenant scoping so a future multi-gym rollout cannot import or invite users into another gym.

#### 6G.4 Exit criteria

- A labelled CSV can be previewed, corrected, approved, and imported without duplicate or unintended accounts.
- Every imported user receives a secure invite or a clear failure reason, and no secret values are stored in the CSV or logs.
- A user can accept the invite, set a password and PIN, log in from mobile, and be deactivated by an Admin when required.
- Admins can see and recover every onboarding outcome without database intervention.
- The bulk onboarding flow passes backend, frontend, lint, build, and relevant end-to-end tests before the mobile functionality phase begins.
- Phase 6G is signed off before creating store accounts or starting Phase 7 release distribution work.

### Phase 6H: Full Mobile Functionality Test (Required Before Store Accounts)

After bulk onboarding is validated, complete a full end-to-end functionality test on the mobile app. This is a release gate, not a visual-only check: every core student, check-in, and teacher workflow must work with real deployed data on a physical iPhone and Android phone. Test the installed PWA and the Capacitor wrapper where available, using a clearly labelled test account and identified test records.

#### 6H.1 Student Portal mobile test

- Log in, remain logged in while navigating, reload, background the app, reopen it, and log out.
- Confirm the shared profile header shows the correct name, photo, rank, nickname, and logout action.
- Open every portal section: analytics, feedback, and comments.
- Verify dashboard statistics, attendance trend, recent attendance, rank progress, and empty states.
- Open feedback from the quick action, submit valid feedback, prevent invalid submission, and confirm the result appears in history.
- Load comments, read long comments without horizontal overflow, reply to a comment, and recover from a failed request with Retry.
- Verify loading, empty, network-error, session-expired, and recovery states are understandable and do not silently show missing data.

#### 6H.2 Check-In mobile test

- Open Check-In from each permitted role and confirm role-appropriate navigation remains available.
- Search for a labelled student, handle no results, select a student, and verify the photo is on the right with `Active` below it and the session timer below the identity details.
- Verify the session timer counts down, warns near expiry, and returns the user to the correct safe state when it expires.
- Use the day selector, confirm the correct date and classes appear, and verify no classes, loading, and schedule-error states.
- Check in to one class, select multiple classes, confirm pending/confirmed states, cancel a pending check-in, and complete the session.
- Retry a failed attendance load, retry a temporary check-in request safely, and repeat a completed check-in to confirm no duplicate attendance record is created.
- Test PIN confirmation, invalid PIN, rate-limit/error handling, confirmation dialogs, and successful recovery.
- Test student search restrictions, new-member creation where permitted, photo upload, camera permission denial, camera capture, photo positioning, photo deletion, and cancel flows.
- Verify kiosk unlock, student selection, check-in, and kiosk lock remain isolated from normal personal mobile navigation.

#### 6H.3 Teacher Dashboard mobile test

- Log in and verify the shared profile header shows the correct name, photo, rank, and logout action with no email-only header.
- Load the weekly schedule, switch days, move to the previous and next week, and confirm dates and classes remain correct.
- Select a class, load its attendance, mark attendance, cancel or correct an attendance action where supported, and confirm the result after refresh.
- Test auto-refresh, loading states, empty schedules, API errors, and Retry recovery.
- Open feedback and comments, apply available filters, read long content, create replies where permitted, and verify mobile scrolling.
- Confirm role restrictions prevent access to routes and actions that the teacher should not use.

#### 6H.4 Device and evidence matrix

- Repeat the three workflow groups on a physical iPhone Safari/PWA and Android Chrome/PWA; repeat the native Capacitor build when the device build is available.
- Test portrait and landscape at representative small and large phone widths, including 320px, 375px, 390px, and 430px-equivalent layouts where possible.
- Test touch targets, keyboard opening and dismissal, scrolling, camera permissions, slow network, temporary offline/reconnected network, fixed dark-theme rendering, and session expiry.
- Record the device model, OS/browser or app build, deployment versions, test account label, tested workflow, result, and sanitized failure evidence. Never record credentials, tokens, PINs, or unnecessary student data.
- Re-test every failed workflow after its fix and run backend tests, frontend tests, lint, production build, and relevant Playwright tests before sign-off.

#### 6H.5 Exit criteria

- Student Portal, Check-In, and Teacher Dashboard workflows pass on both iPhone and Android physical devices.
- No core workflow loses authentication unexpectedly, silently hides API failures, creates duplicate attendance, or leaves the user stuck after an error.
- Responsive layout, navigation, safe-area spacing, touch interaction, keyboard behavior, camera handling, and recovery behavior pass in both browser/PWA and native wrapper contexts where applicable.
- The mobile test matrix and any remaining limitations are recorded in the readiness checklist.
- Phase 6H is signed off before creating store accounts, configuring store signing, or starting Phase 7 release distribution work.

## Phase 7: Device Testing and Release

Begin Phase 7 only after Phases 6B through 6H are signed off. Store account creation, signing, release builds, and broad distribution must not start while tenant isolation, account lifecycle, attendance correctness, onboarding, or mobile workflow validation remains open.

Test on real devices:

- Small iPhone
- Large iPhone
- Android phone
- Tablet
- Slow network
- Offline and reconnected network
- Fixed dark theme
- Camera permissions
- Session expiration
- Rotation and keyboard behavior
- Accessibility and touch targets

Release first to a small teacher and student pilot, then publish broadly.

## Phase 8: Notifications and Student Re-engagement

Add notifications after the core mobile experience and store release path are stable. Start with reliable in-app notifications before adding phone push notifications:

- Add server-side unread/read tracking for comments and other student-facing events.
- Add a notification count and notification area near the top of the Student Portal.
- Make notification items link directly to the relevant comment, feedback, or class action.
- Refresh notification state when the portal opens and after a notification is viewed.
- Add Capacitor push notifications later for high-value reminders such as upcoming classes or teacher replies.
- Request phone notification permission only when the user enables push notifications or reaches a feature that needs them.
- Never include sensitive student data in notification text or cache notifications as authenticated offline data.

The in-app notification layer should be completed before push delivery. Push notifications are a later enhancement, not a prerequisite for the first store release.

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
