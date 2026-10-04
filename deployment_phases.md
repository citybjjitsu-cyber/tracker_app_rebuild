# CKB Tracker Deployment Reference

This document describes the current deployment arrangement. Historical setup notes and credentials have intentionally been removed; secrets belong in Render, Vercel, or GitHub secret stores, never in tracked documentation.

## Current Architecture

| Component | Current service | Status |
|---|---|---|
| Frontend | Vercel project `ckb-tracker` | Live at `https://ckb-tracker.vercel.app` |
| Backend | Render service `ckb-tracker-api-dev` | Live at `https://ckb-tracker-api-dev.onrender.com` |
| Database | Render PostgreSQL `ckb-tracker-db-dev` | Attached to the Render backend |
| Uploads | Render persistent disk | Mounted through `UPLOADS_DIR` |

The repository currently defines one Render-backed environment. A separate production Render service/database is not defined in `backend/render.yaml`. The service name contains `-dev`, but its Render environment is configured as `production` and it serves the current live application.

## Render Configuration

The configuration is in `backend/render.yaml`:

- Build: `cd backend && pip install uv && uv sync`
- Start: `cd backend && uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/health`
- Python: 3.12
- Database: PostgreSQL 16
- Kiosk idle timeout: `KIOSK_IDLE_MINUTES=240`
- Upload directory: `/opt/render/project/src/backend/uploads`

Secret values are supplied through the Render dashboard. Required categories include the database connection, JWT secret, CORS origins, allowed hosts, SMTP credentials, and upload configuration. During the temporary direct Vercel-to-Render browser deployment, production uses `COOKIE_SECURE=True` and `COOKIE_SAMESITE=None`; CSRF protection remains enabled for cookie-authenticated state-changing requests. The target mobile architecture uses a same-origin Vercel proxy, after which `COOKIE_SAMESITE=Lax` is preferred.

After an authentication deployment, verify the Render environment values before mobile testing. The current web flow has been rechecked on the reported phone and desktop and no longer logs out during navigation. The remaining gate is to confirm the login response `Set-Cookie` headers, then use browser remote debugging to verify `/auth/me`, `/auth/refresh`, and the first protected request after expiry include credentials. Do not mark the complete mobile session validation finished based on desktop and one phone alone.

The 2026-10-03 mobile verification checkpoint passed the local automated baseline: 159 backend tests with 77.90% coverage, 184 frontend tests, frontend lint with zero errors, and a successful frontend production build. Phase 3A deployed-session and physical-device verification is complete.

## Vercel Configuration

The frontend root directory is `ckb-tracker`. `NEXT_PUBLIC_API_URL` remains the Render API target used by the Vercel rewrite. After proxy code is deployed, set `NEXT_PUBLIC_API_PROXY=true` for Production and Preview; the browser then uses relative API paths while Vercel forwards them to Render. `ckb-tracker/vercel.json` disables native Vercel Git integration because deployment is controlled through GitHub Actions.

The proxy must preserve the original route paths, especially `/auth/refresh`, and must not cache authenticated responses. After enabling it, change Render `COOKIE_SAMESITE` to `Lax`, redeploy both services, clear the installed PWA/site data, and verify `/auth/me`, `/auth/refresh`, attendance, teacher, and admin requests.

## GitHub Actions

### Test workflow

`.github/workflows/test.yml` runs on every push and pull request:

1. Backend Ruff lint and security checks.
2. Frontend ESLint and npm audit (audit is informational).
3. Alembic migration check and SQLite migration run.
4. Backend pytest.
5. Frontend Vitest with coverage.
6. Playwright E2E tests; this job is currently `continue-on-error: true`.

The workflow uses Python 3.12 and Node 22. The frontend package supports Node 20 or newer.

### Deploy workflow

`.github/workflows/deploy.yml` is triggered manually with `workflow_dispatch`. The operator selects `dev` or `production`. After lint and test jobs pass, it:

1. Calls the matching Render deploy hook.
2. Builds and deploys the frontend through the Vercel CLI.

The workflow expects secret names such as `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `RENDER_DEPLOY_HOOK_DEV`, and, when a production service exists, `RENDER_DEPLOY_HOOK_PROD`. Values must only be stored in GitHub Actions secrets/environments.

## Database Bootstrap

Render startup applies Alembic migrations. Application startup safely initializes rank tiers and backfills missing rank-tier links; it does not seed the full demo dataset.

For a fresh database, run the bootstrap command from `backend/` with administrator-supplied credentials:

```bash
uv run ckb bootstrap --email admin@example.com --password 'Use-a-real-password'
```

The command creates the application roles, the initial admin, and the kiosk service account if they do not already exist. `migrate-and-bootstrap` runs migrations first, then performs the same bootstrap.

## Safe Deployment Procedure

1. Create a feature branch and open a pull request.
2. Wait for the test workflow to complete.
3. Review the changed frontend routes, backend endpoints, migrations, and security configuration.
4. Merge only after the change is approved.
5. Manually dispatch the deployment workflow and select the intended environment.
6. Verify `/health`, login/logout, kiosk unlock/lock, student check-in, teacher attendance, and admin access.
7. Record the commit and deployment versions.

For the PWA installability phase, verify that `/manifest.webmanifest`, `/icon-192.svg`, and `/icon-512.svg` are served by the deployed frontend and that install guidance appears only in supported browser contexts. No authenticated API responses may be added to a cache.

For PWA Phase 4B, verify `/sw.js` is served with the frontend scope, static assets are available after a reload, API and document requests bypass the worker, and an updated worker removes obsolete `ckb-static-*` caches without leaving stale application data. Test offline messaging separately from server-backed operations.

For Mobile API Phase 5A, verify that repeated check-in submissions return the existing attendance record, preserve the `already_checked_in` code, and never create duplicate attendance rows. Treat the duplicate response as non-retryable while keeping new-network and server errors distinguishable.

For Mobile API Phase 5B, verify `GET /classes/weekly` returns the requested Monday-first week, all seven day buckets, normalized day names, concrete `scheduled_date` values, and stable ordering by time and class name. Confirm the teacher schedule uses this endpoint without changing attendance actions.

For Mobile API Phase 5C, verify kiosk class failures, check-in schedule failures, student search failures, and attendance failures display a visible retry action. Confirm intentional empty results remain distinguishable and that write operations are not automatically repeated.

For Mobile API Phase 5D, run `npm run test:e2e` with the local baseline and then repeat the documented schedule, check-in, duplicate, refresh, logout, and expiry flows against the deployed frontend/API. Record only timestamps, deployment versions, route outcomes, and pass/fail evidence; never record credentials, tokens, PINs, or personal student data.

Because there is no separate staging environment, use a dedicated test account and test data when validating the current live service. Back up the database before authentication, schema, or attendance changes.

## Rollback

- Keep the previous Vercel and Render deployment versions identifiable.
- Disable mobile features with feature flags where available.
- Roll back application code through the hosting provider rather than destructive Git operations.
- Do not destructively roll back an applied database migration; create a corrective migration.
- If a service worker is introduced later, document cache invalidation before release.
- PWA Phase 4A and Phase 4B are limited to installability, static assets, update handling, and network status. Authenticated data caching and offline writes remain prohibited.
