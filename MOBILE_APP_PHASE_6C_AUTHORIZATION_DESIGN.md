# Phase 6C Authorization and Migration Design

Status: Implementation slice in progress
Depends on: `MOBILE_APP_PHASE_6B_SCOPE_MATRIX.md`
Gate: Review before runtime authorization or production schema changes

The first additive schema slice is represented by Alembic revision `b3c4d5e6f7a8`. It adds membership and gym-scoped role tables and backfills the current gym without enabling cross-gym authorization yet.

The current runtime slice adds active-gym scoping to class, attendance, feedback, feedback reports, comments, dashboard reports, user reads/search, exports, imports, profile mutations, photos, plus audited membership and role assignment management and kiosk gym selection. Broader report/export minimization remains outstanding.

## Design Goals

- Preserve one global person identity while making every operational permission gym-scoped.
- Preserve current single-gym behavior during the migration.
- Make the server authoritative for gym context, roles, memberships, and resource scope.
- Revoke access promptly when membership, role, credential, or guardian permissions change.
- Keep historical attendance, feedback, progress, and audit records available after membership removal.

## Proposed Core Tables

### `gym_memberships`

One row links a global user to one gym.

| Field | Requirement |
| --- | --- |
| `id` | Primary key |
| `user_uuid` | Required global user reference |
| `gym_id` | Required gym reference |
| `status` | `pending`, `invited`, `active`, `suspended`, `deactivated`, or `archived` |
| `is_primary` | At most one active primary membership per user |
| `effective_date` | Required membership start |
| `end_date` | Optional membership end |
| `created_by` | Actor that created the membership |
| `status_reason` | Required for suspension, deactivation, or removal |
| timestamps | Created, updated, and status-changed timestamps |

Constraints:

- Unique active membership per `(user_uuid, gym_id)`.
- Only active memberships may be selected as an active gym context.
- Removing a membership revokes access but does not delete historical records.

### `gym_role_assignments`

Gym-scoped role assignments are separate from platform roles.

| Field | Requirement |
| --- | --- |
| `id` | Primary key |
| `membership_id` | Required gym membership reference |
| `role_id` | Existing role reference |
| `status` | Active or revoked |
| `effective_date` / `end_date` | Assignment validity window |
| `assigned_by` / `revoked_by` | Audited actors |
| `reason` | Required for revocation or elevated access |

Constraints:

- No duplicate active assignment for `(membership_id, role_id)`.
- Gym Admins may manage roles only for their gym.
- Platform Admins may manage roles across gyms.
- New invitations receive Student by default.

### Active gym context

- Browser and native clients may switch only among active memberships.
- The server validates the selected membership on every protected request.
- A client-supplied `gym_id` never grants access by itself.
- Tokens/session records must carry or resolve the active gym context and a membership/role version.
- Membership or role changes invalidate affected sessions immediately.

### Kiosk context

- Kiosk staff authenticate first, then select a gym when multiple active gym memberships exist.
- The selected gym is bound to the kiosk session and staff token context.
- Student search, PIN verification, class loading, attendance status, check-in, and lock operations use that gym.
- A kiosk cannot switch gyms without staff re-authentication.

## Authorization Matrix

| Capability | Student | Guardian | Teacher | Gym Admin | Platform Admin | Kiosk Staff |
| --- | --- | --- | --- | --- | --- | --- |
| View own profile/records | Own active gyms | Dependents | Own records | Own gym users | All gyms | No direct profile access |
| View student directory | None | Dependents only | All students in assigned gyms | All students in gym | All gyms | Search selected gym only |
| Submit self/dependent check-in | Self | Active dependents | No ordinary self-service requirement | As permitted | As permitted | Selected student in bound gym |
| Confirm attendance | No | No | Assigned gym occurrences | All gym occurrences | All gyms | No |
| Manually add late attendance | No | No | Assigned gyms; confirmed with reason | Gym scope | All gyms | No |
| Remove check-in | Own cancellation request | Own dependent request | Assigned gym queue; cancellation with reason | Gym scope | All gyms | No destructive removal |
| View feedback | Own | Dependents' published feedback | Assigned gyms; rostered instances after rosters | All gym feedback | All gyms | No |
| Edit/delete feedback | Own permitted edits only | No | No | Policy-controlled moderation | All gyms | No |
| Manage memberships | No | No | No | Own gym | All gyms | No |
| Assign Teacher/Gym Admin roles | No | No | No | Own gym | All gyms | No |
| Export data | No | Own dependents where allowed | No | Own gym | All gyms | No |
| Manage shared content | No | No | Use/view/copy only | Own content | Platform content | No |
| View audit logs | Own actions where exposed | Own actions where exposed | Own actions where exposed | Own gym | All gyms | No |

Notes:

- Teacher visibility is gym-wide for the student directory and attendance queue, but feedback narrows to rostered class instances once roster assignments exist.
- Teacher-created late attendance is immediately confirmed, requires a reason, and records the teacher as actor.
- Removing attendance cancels and retains the record; it does not hard-delete history.
- Gym Admins may manage memberships and roles only inside their gym.

## Invitation and Membership Flows

### Gym Admin invitation

1. Gym Admin selects their own gym and invites a user as Student.
2. The selected membership is `pending`/`invited`.
3. The user accepts the invitation and membership becomes `active`.
4. The acceptance event and inviter are audited.

### Platform Admin invitation

1. Platform Admin selects one or more gyms and invites a user as Student.
2. Each selected membership is `pending`/`invited`.
3. Acceptance activates all selected memberships.
4. Platform Admin may add or remove memberships later.

### Adding a gym to an active user

- Platform Admin additions become active immediately.
- The user receives the new active-gym option on the next session refresh.
- The membership addition and permission refresh are audited.

### Membership removal

- Gym Admins may suspend/deactivate users in their gym; Platform Admins may do so across gyms.
- Affected sessions are revoked immediately.
- Historical attendance, feedback, progress, and audit records remain available according to scope and retention rules.

## Migration Sequence

1. Back up the production database and record the current schema and role behavior.
2. Add `gym_memberships` and `gym_role_assignments` as additive tables.
3. Backfill every existing user into the current gym with an active membership.
4. Backfill existing global roles into gym-scoped assignments without changing current effective access.
5. Add membership and role-version fields needed for session invalidation.
6. Add server-side active-gym resolution and authorization helpers behind a controlled feature flag.
7. Update read endpoints to scope responses by active membership before changing write endpoints.
8. Update writes, exports, uploads, feedback, comments, invites, reports, and kiosk operations.
9. Add cross-gym privacy tests and run a production-like migration rehearsal.
10. Enable multi-gym switching and kiosk gym selection after all authorization tests pass.

## Required Test Groups

- A user can be Student at Gym A and Teacher at Gym B without cross-gym leakage.
- A Gym Admin cannot read, export, or mutate Gym B data by changing a client-supplied ID.
- A Platform Admin can operate across gyms and is fully audited.
- Membership suspension/removal revokes browser and native sessions.
- A user can switch only among active memberships.
- Kiosk staff must select a gym when they have multiple memberships; the kiosk cannot cross that boundary.
- Teachers can view all students and attendance in assigned gyms, confirm assigned attendance, add late attendance with a reason, and cancel attendance without deleting history.
- Feedback visibility narrows from gym-wide transitional access to rostered occurrence access when rosters are enabled.
- Guardian access is limited to active dependents and cannot expose other students or private teacher notes.
- Exports, photos, uploads, comments, invites, and audit records enforce the same gym scope.

## Open Implementation Questions

- Exact token/session representation for active gym and membership version.
- Membership and role changes currently revoke all affected user sessions; membership-version claims remain a future optimization.
- Whether `gym_memberships` or a separate `organisations` table owns future billing/configuration.
- Roster migration shape for recurring assignments and dated occurrence overrides.
- Feature-flag and rollback strategy for enabling multi-gym authorization.
