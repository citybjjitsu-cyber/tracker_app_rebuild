# Phase 6B Scope and Privacy Matrix

Status: Approved policy baseline; Phase 6C authorization baseline deployed
Owner: Product and engineering
Gate: Complete roster/occurrence design before Phase 6C sign-off or bulk onboarding

## Purpose

This document records the current data boundaries, identifies gaps in the single-gym implementation, and captures the decisions required before gym-scoped authorization is added. It is intentionally a design artifact; it does not authorize a schema migration or change runtime permissions.

## Current Operating Model

- `gym_locations` is currently used as the gym/location record.
- Users and roles are global. `user_roles` has no gym membership or gym scope.
- Classes carry `gym_id`; class instances inherit the class relationship but do not store a separate gym.
- Attendance now stores `gym_id` and `class_instance_id` and is unique by gym, occurrence, student, and date.
- Kiosk access is staff-scoped and operates against a selected student, but it has no explicit active-gym context.
- Most protected endpoints authorize a role or authenticated session, but do not consistently enforce gym membership boundaries.
- Users may belong to multiple gyms and switch active gym context; the switching UI is deferred to implementation design.
- Multi-gym kiosk staff select the gym during kiosk unlock, and the selected gym remains bound to the kiosk session.

## Scope Matrix

| Area | Current scope | Required decision | Phase 6C consequence |
| --- | --- | --- | --- |
| User identity | Global by `user_uuid` | Keep person identity global | Add gym memberships without duplicating users |
| Roles | Global `user_roles` | Decide whether role assignment is gym-scoped, platform-scoped, or both | Add scoped role assignments and authorization helpers |
| Gym/location | `gym_locations` is both gym and location | Decide whether organisation, gym tenant, and physical location are separate | Choose migration shape before membership backfill |
| Classes | Class has optional `gym_id` | Require every active class to belong to a gym | Enforce gym context on schedules and class administration |
| Class instances | Dated occurrence linked to a class | Store effective gym and teacher context through the occurrence | Support substitutions and historical snapshots |
| Attendance | Gym/instance/student/date scoped | Preserve current identity and add source/correction policy | Scope reads and writes by active gym |
| Feedback | Linked to attendance and user | Decide visibility for student, assigned teacher, gym staff, and admins | Enforce occurrence and gym authorization |
| Comments | User-targeted feed/thread model | Define participants, gym context, and moderation scope | Add explicit conversation membership and gym checks |
| News/themes | Global-looking records | Decide platform, organisation, or gym ownership | Scope reads and admin writes |
| Rank tiers/targets/terms | Primarily global with user/class references | Define inheritance and gym/program ownership | Snapshot effective policy in historical records |
| Curricula/lessons/class types | Linked to classes or curricula | Decide shared, copied, or gym-owned content | Add content ownership and publish/archive rules |
| Invites | User/invite based, not gym-scoped | Define target gym, inviter authority, and expiry visibility | Add gym to invite lifecycle and audit records |
| Reports/exports | Authenticated endpoints with broad user/class parameters | Define permitted subject, gym, date range, and export scope | Enforce server-side filters and bounded exports |
| Uploads/photos | User/profile paths | Require authorization or signed access | Prevent cross-gym and unauthenticated file access |
| Kiosk settings | Staff kiosk token, no explicit gym context | Bind kiosk sessions to one gym | Prevent cross-gym kiosk use and data leakage |
| Audit logs | Actor/resource/action records | Add gym, request, source device, and redacted before/after context | Make audit events tenant-aware and append-only |
| Family/guardian | Not modeled | Decide person/account separation, dependents, consent, and pickup rules | Add guardian relationships and scoped visibility |

## Approved Privacy Defaults

These defaults were approved during the Phase 6B policy review:

1. A user identity is global, but every operational relationship is evaluated within an active gym membership.
2. A user may see their own profile, attendance, feedback, progress, and consent records across only gyms where they have an active relationship.
3. Teachers may view all students in their active gym; attendance, feedback, and conversation actions remain subject to occurrence and permission checks.
4. Gym administrators may manage only their gym; platform administrators are the only cross-gym operators.
5. Client-supplied `gym_id`, teacher IDs, student IDs, and role claims are hints only; the server derives and validates authorization context.
6. Kiosk sessions are bound to one gym and cannot switch gym context without staff re-authentication.
7. Photos, exports, comments, feedback, and audit records require explicit authorization and are not public by path.
8. Historical attendance, feedback, points, teacher attribution, and effective policy are immutable snapshots except through audited corrections.

## Approved Decisions

- [x] `gym_locations` represents one gym and one physical location for the current model.
- [x] A global person identity may have memberships and different roles at multiple gyms.
- [x] Platform Admins may operate across gyms; Gym Admins are restricted to their active gym.
- [x] Teachers can view all students in their active gym; attendance and edit permissions remain separately controlled.
- [x] Lessons, curricula, classes, rank systems, terms, and targets are gym-owned or platform-owned and can be permissioned for live sharing or copy/fork.
- [x] Receiving gyms may use, view, and copy/fork shared content but cannot edit the owner source.
- [x] Feedback is visible to the student, assigned occurrence teachers, and authorized Gym Admins.
- [x] Progress conversations use explicit participant threads with gym and optional class/attendance/progress context.
- [x] Guardians have limited dependent access, including audited dependent check-in; they cannot impersonate students or edit teacher records.
- [x] Minors may have independent accounts, with guardian consent controlling account, data-sharing, photo, messaging, and notification policies.
- [x] Guardians manage emergency contacts and pickup permissions; authorized staff can view them within the relevant gym.
- [x] Teacher operational notes are staff-only; published feedback and approved progress are guardian-visible.
- [x] Operational history is retained with controlled correction and anonymization.
- [x] Audit records are append-only and gym-scoped, with Platform Admin cross-gym oversight.
- [x] Invitations target one gym and create or propose a pending membership.
- [x] Memberships use explicit lifecycle states and access/credential changes revoke affected sessions immediately.
- [x] Teacher assignments use recurring rosters plus occurrence overrides, preserving scheduled and actual teacher attribution.
- [x] Multi-gym kiosks require gym selection during unlock.

## Additional Approved Operational Rules

- [x] Invitations default to Student and may target one or more gyms when created by a Platform Admin.
- [x] Gym Admins may invite only to their own gym and may manage memberships and roles within that gym.
- [x] Selected invitation memberships are pending until acceptance, then become active.
- [x] Platform Admin additions to an active user become active immediately.
- [x] Teachers may view attendance for all classes in their assigned gyms, confirm attendance, manually add late students with an audit reason, and cancel records without deleting history.
- [x] Teacher feedback access is view-only; it is gym-wide during transition and narrows to rostered occurrences when rosters are enabled.
- [x] Students have self-only visibility; Teachers see operational minimum profile data.
- [x] Gym Admins and Platform Admins may export within their authorized scope; exports are bounded and audited.
- [x] Student photos and uploads are restricted to authorized operational users.
- [x] Platform defaults may be overridden by Gym Admins for gym-specific news and approved theme settings.

## Phase 6C Entry Requirements

Phase 6C should not begin schema implementation until:

- The approved decisions above are translated into an authorization and migration design.
- A production database backup and schema inventory exist.
- Every existing user has a deterministic current-gym membership mapping.
- Cross-gym privacy and role-switch test cases are written.
- A migration plan exists for memberships, scoped roles, active-gym context, rosters, and occurrence assignments.
