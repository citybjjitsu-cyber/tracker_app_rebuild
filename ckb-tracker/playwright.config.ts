import { defineConfig } from '@playwright/test'

const BACKEND_URL = 'http://127.0.0.1:8000'
const FRONTEND_URL = 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 30000,
  use: {
    baseURL: FRONTEND_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },
  webServer: [
    {
      command: 'uv run uvicorn app.main:app --host 127.0.0.1 --port 8000',
      cwd: '../backend',
      url: BACKEND_URL,
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'npm run dev',
      cwd: '.',
      url: FRONTEND_URL,
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
  projects: [
    {
      name: 'kiosk-e2e',
      testMatch: '**/*.spec.ts',
    },
  ],
})
