import { defineConfig } from '@playwright/test'

const BACKEND_URL = 'http://127.0.0.1:8000'
const FRONTEND_URL = 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 2,
  workers: 1,
  reporter: [['html'], ['list']],
  timeout: 90000,
  use: {
    baseURL: FRONTEND_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'ALLOWED_HOSTS=* uv run --no-sync uvicorn app.main:app --host 127.0.0.1 --port 8000',
      cwd: '../backend',
      url: BACKEND_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npm run dev',
      cwd: '.',
      url: FRONTEND_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
  projects: [
    {
      name: 'kiosk-e2e',
      testMatch: '**/*.spec.ts',
    },
  ],
})
