# CKB Tracker — Testing, Rollout & Production Cutover Plan

> **Current-state note:** This document contains the longer-term rollout and cutover plan. The repository currently has one Render-backed environment represented by `ckb-tracker-api-dev.onrender.com`, no separate staging environment, and no active users. GitHub Actions tests run on pushes and pull requests; deployment is manually dispatched through `deploy.yml` with a selected environment. Mobile-specific work is tracked separately in `MOBILE_APP_PLAN.md`.

## 1. Testing Schedule — Dev Pipeline

### CI Gate (every push and pull request)
| Gate | What | Who | Blocking? |
|---|---|---|---|
| Backend lint (Ruff) | `ruff check .` + `ruff check --select S .` | CI | Yes |
| Frontend lint | `npm run lint` | CI | Yes |
| Backend tests | `pytest --cov=app --cov-fail-under=75` | CI/deploy workflow | Yes in deploy workflow |
| Frontend tests | `vitest run --coverage` | CI | Yes |
| npm audit | High+ severity check | CI | No (informational) |

### Dev Deployment Gate (manual workflow_dispatch)
| Gate | What | Who | Blocking? |
|---|---|---|---|
| CI green | All gates pass | CI | Yes |
| Smoke test | Health endpoint, kiosk unlock, student PIN check-in | Developer | Yes |
| Regression | Existing flows still work | Developer | Yes |

### Pre-Production Gate (before prod deploy)
| Gate | What | Who | Blocking? |
|---|---|---|---|
| All CI green | Lint + tests + coverage | CI | Yes |
| Dev smoke pass | Manual verification complete | Developer | Yes |
| Security review | Auth, rate limiting, CSRF, CORS | Developer | Yes |
| CSV import validation | Test with realistic dataset | Developer | Yes |

---

## 2. CSV Import Enhancement Plan (for Large-Scale Backfill)

### Current Gaps
- No PIN support in CSV import → imported users can't use kiosk
- No password update for existing users
- No audit logging
- No batch result preview (dry-run mode)
- Row limit of 500 may be too small
- No duplicate detection beyond email

### Development Phases

#### Phase A: Enhanced CSV Import (backlog item — before full rollout)
- [ ] Add `pin` column support to CSV import
- [ ] Add `password` update support for existing users
- [ ] Add dry-run mode (validate all rows, report errors, commit nothing)
- [ ] Raise row limit to 5000 with configurable batch size
- [ ] Add audit logging for batch imports
- [ ] Return per-row detailed results (which rows were created/updated/skipped)
- [ ] Add `profile_image_url` column support

#### Phase B: Import UI & Workflow (backlog item)
- [ ] CSV upload progress indicator for large files
- [ ] Preview first 10 rows before committing
- [ ] Clear error messages for each invalid row
- [ ] Download error report CSV
- [ ] Admin-only import permission enforcement

#### Phase C: Backfill Execution
- [ ] Export current user data from existing system as CSV
- [ ] Map fields to CKB Tracker schema
- [ ] Run import in dry-run mode, iterate on errors
- [ ] Run live import, verify counts match
- [ ] Spot-check 5% of imported users

---

## 3. Limited Release Rollout — Dev Environment (Phased)

### Phase 0: Controlled Environment Ready (current)
- CI passes ✓
- Dev deploy pipeline works ✓
- PIN redirect fix deployed ✓

### Phase 1: Internal Validation (Week 1)
| Activity | Details | Success Criteria |
|---|---|---|
| Developer smoke tests | Full workflow: kiosk unlock → student search → PIN check-in → admin dashboard → teacher view | All flows return 200 |
| Staff account creation | Create test accounts for all roles (Admin, Teacher, Student, Kiosk) | Login works for each role |
| CSV import test | Import 100 test users via CSV, verify PIN/password set correctly | All rows import cleanly |
| Edge cases | Duplicate email, missing fields, invalid rank, zero-row CSV | Graceful error handling |
| Student search | Search by name, partial match, special characters | Results match expectations |
| Kiosk check-in | Student finds name → enters PIN → check-in recorded | Attendance record created |
| Kiosk security | Configured idle timeout (currently 240 minutes), 3 PIN strike lockout, staff re-auth required | All enforced |

### Phase 2: Limited Class Rollout (Week 2)
Invite 1-2 real classes (10-20 students + 1-2 teachers) to use the dev environment.

| Activity | Details |
|---|---|
| Class setup | Create class schedules matching real-world times |
| Student onboarding | Import real students via enhanced CSV, distribute PINs |
| Teacher training | Walk-through of teacher dashboard (attendance, grading, notes) |
| Live kiosk | Staff unlocks kiosk, students check in via PIN |
| Observation period | 1 week of real usage, collect feedback |

**Rollback criteria for Phase 2:**
- Any user data loss or corruption
- Kiosk fails to lock/unlock (security)
- Attendance records incorrect
- PIN verification fails >1% of attempts

### Phase 3: Extended Rollout (Week 3)
| Activity | Details |
|---|---|
| Scale up | Add 3-5 more classes (50-100 students) |
| Stress test | 10+ simultaneous kiosk check-ins, measure response time |
| Teacher onboarding | All teachers get accounts and dashboard training |
| Admin training | CSV import, user management, reporting |
| Feedback loop | Bug tracking, feature requests, prioritization |

**Success metrics:**
- Kiosk check-in < 2 seconds
- No PIN lockout false positives
- Admin CSV import handles 5000 rows < 30 seconds
- Attendance reports match manual roll call within 5%

### Phase 4: Full Dev Rollout (Week 4)
| Activity | Details |
|---|---|
| All classes active | All students imported, all teachers onboarded |
| Replace manual attendance | Kiosk becomes primary check-in method |
| 1-week parallel run | Manual roll call + kiosk data compared |
| Go/no-go decision | Based on accuracy, reliability, feedback |

---

## 4. Migration & Cutover to Production

### Pre-Migration Requirements
- [ ] Production Render service provisioned with Postgres
- [ ] Production Vercel project configured
- [ ] Custom domain configured (if applicable)
- [ ] GitHub Environment "production" with required reviewers
- [ ] `RENDER_DEPLOY_HOOK_PROD` secret set
- [ ] SSL certificates active
- [ ] Backups configured (automated Postgres snapshots)
- [ ] Monitoring/alerts configured

### Data Migration Strategy

Since the backfill will happen in DEV first, the PROD migration is primarily a **data export from DEV → import to PROD**:

```
DEV Postgres ──> pg_dump / CSV export ──> PROD Postgres
```

| Step | Method | Est. Time |
|---|---|---|
| 1. Export DEV database | `pg_dump -U user -d dev_db --data-only > dev_data.sql` | 1-2 min |
| 2. Sanitize if needed | Strip dev-only accounts, test data | 10 min |
| 3. Import to PROD | `psql -U user -d prod_db < dev_data.sql` | 2-5 min |
| 4. Run migrations | Alembic (if configured) | < 1 min |
| 5. Verify row counts | Compare aggregate counts | 5 min |

### Cutover Sequence

#### T-7 Days: Freeze
- No non-essential changes to main branch
- All features for launch must be merged
- Begin documentation freeze

#### T-3 Days: Dry Run
- Execute full deploy pipeline to a staging environment
- Run data migration dry-run
- Verify all test scenarios on staging
- Document any issues

#### T-1 Day: Pre-Cutover
- Final DEV smoke test
- Announce maintenance window (suggest 2-hour window, e.g., 10 PM - 12 AM)
- Disable CSV import/export on DEV (avoid data drift)

#### T-0: Cutover

```
21:00  ──  Lock DEV: disable user creation, kiosk check-in
21:05  ──  Export DEV database (pg_dump)
21:15  ──  Import to PROD (psql)
21:25  ──  Run migration scripts
21:30  ──  Deploy backend to PROD (Render)
21:35  ──  Deploy frontend to PROD (Vercel)
21:40  ──  Smoke test: health check, login, kiosk, PIN
21:50  ──  Smoke test: admin dashboard, teacher view
21:55  ──  Verify: attendance records, user count
22:00  ──  GO / NO-GO decision
```

#### Rollback (if NO-GO)
```
22:00  ──  Revert PROD backend to previous deploy
22:05  ──  Revert PROD frontend to previous deploy
22:10  ──  Restore PROD database from pre-cutover backup
22:15  ──  Re-enable DEV
22:20  ──  Post-mortem
```

### Post-Cutover (T+1 week)

| Day | Activity |
|---|---|
| T+1 | Monitor error rates, verify all users can log in |
| T+2 | Spot-check attendance records vs manual backup |
| T+3 | Teacher feedback session |
| T+5 | Performance review (response times, error rates) |
| T+7 | Full go-live confirmed, DEV decommissioned or repurposed |

### Rollback Criteria (any one triggers rollback)
1. > 1% of requests return 5xx errors
2. Kiosk check-in fails for any student
3. PIN verification errors > 1%
4. Attendance records lost or duplicated
5. User cannot access their account
6. Database migration corrupts data

---

## 5. Verification Checklist (Dev — Right Now)

Before proceeding to Phase 1, verify the current dev deploy:

- [ ] Health endpoint `/` returns 200
- [ ] Kiosk unlock `/kiosk/unlock` works with staff@test.com / password123
- [ ] PIN check-in with student PIN (1234) works
- [ ] Kiosk lock after the configured idle timeout (currently 240 minutes)
- [ ] 3 PIN strikes → 5-min lockout
- [ ] Admin dashboard loads
- [ ] Teacher view loads
- [ ] CSV import accepts a test file
- [ ] CSV export produces valid CSV
- [ ] All 128 backend tests pass on CI
- [ ] All frontend tests pass on CI
