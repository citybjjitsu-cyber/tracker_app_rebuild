# CKB Tracker Frontend

The CKB Tracker frontend is a Next.js 16 App Router application for kiosk check-in, student, teacher, admin, and public news workflows.

## Requirements

- Node.js 20 or newer
- A running CKB Tracker FastAPI backend

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Set `NEXT_PUBLIC_API_URL` in `.env.local` to the backend URL. For local development, use `http://localhost:8000`; otherwise the client defaults to the configured deployed API URL.

The frontend resolves its display timezone from `NEXT_PUBLIC_SITE_TIMEZONE`, then the browser's IANA timezone, then UTC. The browser timezone is also sent as `X-Client-Timezone` so the backend can calculate an attendance date when `SITE_TIMEZONE` is not configured. Use IANA names such as `Pacific/Auckland`, not fixed UTC offsets. Daylight saving is handled automatically by the IANA timezone database.

For Vercel deployments, set `NEXT_PUBLIC_API_PROXY=true`. Browser API calls then use same-origin paths and Vercel forwards them to Render. Admin API rewrites are limited to `/admin/invites` and `/admin/test-email`; the frontend `/admin` page and kiosk pages remain Next.js routes.

## Commands

```bash
npm run dev                 # Start the Next.js development server
npm run build               # Create a production build
npm run start               # Serve the production build
npm run lint                # Run ESLint
npm run test                # Run Vitest unit/component tests
npm run test -- --coverage  # Run tests with coverage thresholds
npm run test:e2e            # Run Playwright tests
```

The frontend test thresholds are configured in `vitest.config.ts`:

- Statements: 65%
- Branches: 50%
- Functions: 50%
- Lines: 65%

## Application Routes

- `/` — locked/unlocked staff-authenticated kiosk landing page
- `/check-in` — tablet check-in flow
- `/portal` — student portal
- `/teacher` — teacher attendance, schedule, feedback, comments, and student management
- `/admin` — administrative dashboard
- `/news` — public published news
- `/login`, invite, password recovery, and PIN recovery routes — public authentication workflows

## Mobile Status

The application is responsive web software with an installable PWA and thin Capacitor Android/iOS wrappers. The Student Portal is the default destination after normal login for every role, while the root route remains the staff-authenticated kiosk. The teacher schedule and Student Portal have mobile layouts, and native authentication uses secure platform storage. Physical-device matrix testing and store release preparation are still pending.

The following remain intentionally deferred:

- Offline authenticated writes or attendance background sync
- Push notifications
- Server-side unread/read notification tracking
- Native push notifications, biometric unlock, and deep links

See the repository-level `MOBILE_APP_PLAN.md` and `MOBILE_APP_READINESS_CHECKLIST.md`.

The planned Admin Site Settings tab will allow administrators to set the site timezone, locale, and time display preference without changing deployment environment variables.

## Deployment

The frontend is deployed to Vercel. The current configured API is the Render service at `https://ckb-tracker-api-dev.onrender.com`.

GitHub Actions runs tests on pushes and pull requests. Deployment is started manually through the `workflow_dispatch` inputs in `.github/workflows/deploy.yml`; it is not an automatic deployment on every push to `main`.
