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

The application is currently responsive web software, not yet a PWA or native mobile app. The teacher schedule has mobile and desktop layouts, Monday-first week navigation, normalized day labels, and focused automated tests. Physical-device testing is still pending.

The following are intentionally not implemented yet:

- `manifest.webmanifest` and install prompts
- Service-worker caching or offline writes
- Push notifications
- Capacitor, iOS, or Android projects
- Native secure storage, biometric unlock, camera, or deep links

See the repository-level `MOBILE_APP_PLAN.md` and `MOBILE_APP_READINESS_CHECKLIST.md`.

## Deployment

The frontend is deployed to Vercel. The current configured API is the Render service at `https://ckb-tracker-api-dev.onrender.com`.

GitHub Actions runs tests on pushes and pull requests. Deployment is started manually through the `workflow_dispatch` inputs in `.github/workflows/deploy.yml`; it is not an automatic deployment on every push to `main`.
