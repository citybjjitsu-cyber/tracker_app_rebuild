import { Page, expect } from '@playwright/test'
import { E2E_KIOSK_EMAIL, E2E_KIOSK_PASSWORD, E2E_API_BASE } from './config'

export const BASE_URL = E2E_API_BASE

export interface MockUser {
  user_uuid: string
  first_name: string
  last_name: string
  email: string
  rank: string
  nicknames?: string
  profile_image_url?: string
}

export const KIOSK_USER: MockUser = {
  user_uuid: 'kiosk-uuid-0000-0000-000000000001',
  first_name: 'Kiosk',
  last_name: 'Service',
  email: E2E_KIOSK_EMAIL,
  rank: 'White',
}

export const ADMIN_USER: MockUser = {
  user_uuid: 'admin-uuid-0000-0000-000000000002',
  first_name: 'Admin',
  last_name: 'User',
  email: 'admin@example.com',
  rank: 'Black',
}

export const STUDENT_USER: MockUser = {
  user_uuid: 'student-uuid-0000-0000-000000000003',
  first_name: 'John',
  last_name: 'Smith',
  email: 'john@example.com',
  rank: 'Blue',
  nicknames: 'J-Smitty',
}

export const TEACHER_USER: MockUser = {
  user_uuid: 'teacher-uuid-0000-0000-000000000004',
  first_name: 'Mike',
  last_name: 'Johnson',
  email: 'mike@example.com',
  rank: 'Black',
}

export async function mockKioskUnlock(page: Page) {
  await page.route('**/kiosk/unlock', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-kiosk-access-token',
        refresh_token: 'mock-kiosk-refresh-token',
        user: KIOSK_USER,
        roles: [{ id: 5, name: 'Kiosk', description: 'Kiosk role' }],
      }),
    })
  })
}

export async function mockKioskLock(page: Page) {
  await page.route('**/kiosk/lock', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Kiosk locked' }),
    })
  })
}

export async function mockPinVerify(page: Page, valid: boolean) {
  await page.route('**/kiosk/verify-pin-for-user', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ valid }),
    })
  })
}

export async function mockUsersSearch(page: Page, users: MockUser[]) {
  await page.route('**/users/search*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(users),
    })
  })
}

export async function goThroughKioskPinFlow(page: Page, user: MockUser, pin: string) {
  const findBtn = page.getByRole('button', { name: /find your name/i })
  if (await findBtn.isVisible({ timeout: 5000 })) {
    await findBtn.click()
    await page.waitForTimeout(300)
  }

  const searchInput = page.locator('input[placeholder="Type your name..."]')
  if (await searchInput.isVisible({ timeout: 5000 })) {
    await searchInput.fill(user.first_name)
    await page.waitForTimeout(500)
  }

  const userBtn = page.getByText(new RegExp(`${user.first_name} ${user.last_name}`, 'i')).first()
  if (await userBtn.isVisible({ timeout: 5000 })) {
    await userBtn.click()
    await page.waitForTimeout(300)
  }

  for (const digit of pin) {
    await page.getByRole('button', { name: digit, exact: true }).click()
    await page.waitForTimeout(100)
  }
}

export async function mockAuthLogin(page: Page, user: MockUser, roleNames: string[], status = 200) {
  await page.route('**/auth/login', async route => {
    if (status !== 200) {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid credentials' }),
      })
      return
    }
    const roles = roleNames.map((name, i) => ({ id: i + 1, name }))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Set-Cookie': [
          'access_token=mock-access-token; Path=/; HttpOnly; SameSite=Lax',
          'refresh_token=mock-refresh-token; Path=/auth/refresh; HttpOnly; SameSite=Lax',
          'csrf_token=mock-csrf-token; Path=/; SameSite=Lax',
        ].join(', '),
      },
      body: JSON.stringify({
        user,
        roles,
        csrf_token: 'mock-csrf-token',
      }),
    })
  })
}

export async function mockAuthMe(page: Page, user: MockUser | null, roleNames: string[]) {
  await page.route('**/auth/me', async route => {
    if (!user) {
      await route.fulfill({ status: 401 })
      return
    }
    const roles = roleNames.map((name, i) => ({ id: i + 1, name }))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user,
        roles,
        csrf_token: 'mock-csrf-token',
      }),
    })
  })
}

export async function mockAuthMeConditional(page: Page, user: MockUser, roleNames: string[]) {
  await page.route('**/auth/me', async route => {
    const cookie = route.request().headers()['cookie'] || ''
    if (!cookie.includes('access_token=mock-access-token') && !cookie.includes('access_token=')) {
      await route.fulfill({ status: 401 })
      return
    }
    const roles = roleNames.map((name, i) => ({ id: i + 1, name }))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user, roles, csrf_token: 'mock-csrf-token' }),
    })
  })
}

export async function mockAuthLogout(page: Page) {
  await page.route('**/auth/logout', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Logged out' }),
    })
  })
  await page.route('**/auth/logout-all', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Logged out' }),
    })
  })
}

export async function mockBulkCheckIn(page: Page) {
  await page.route('**/attendance/bulk-check-in', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Check-in successful', count: 1 }),
    })
  })
}

export async function mockAttendanceConfirm(page: Page) {
  await page.route(/\/attendance\/\d+\/confirm/, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Attendance confirmed' }),
    })
  })
  await page.route('**/attendance/bulk-confirm', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Bulk confirm successful', count: 2 }),
    })
  })
}

export async function mockAttendanceCancel(page: Page) {
  await page.route(/\/attendance\/\d+\/cancel/, async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Cancelled' }) })
  })
}

export async function mockCreateAttendanceDirect(page: Page) {
  await page.route('**/attendance/direct', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Check-in recorded' }),
    })
  })
}

export async function mockUserCreate(page: Page) {
  await page.route('**/users/', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...ADMIN_USER, user_uuid: 'new-user-uuid' }),
      })
    } else {
      await route.continue()
    }
  })
}

export async function mockUserUpdate(page: Page) {
  await page.route(/\/users\/[^/]+$/, async route => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...ADMIN_USER }),
      })
    } else {
      await route.continue()
    }
  })
}

export async function mockFeedbackSubmit(page: Page) {
  await page.route('**/feedback/', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Feedback submitted' }),
    })
  })
}

export async function mockCommentCreate(page: Page) {
  await page.route('**/comments/', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, content: 'Comment created' }),
      })
    } else {
      await route.continue()
    }
  })
}

export async function mockClassCreate(page: Page) {
  await page.route('**/classes/', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 99, class_name: 'New Class' }),
      })
    } else {
      await route.continue()
    }
  })
}

export async function mockThemeMutations(page: Page) {
  await page.route('**/themes/**', async route => {
    const method = route.request().method()
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'OK' }) })
    } else {
      await route.continue()
    }
  })
}

export async function mockNewsMutations(page: Page) {
  await page.route('**/news/**', async route => {
    const method = route.request().method()
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'OK' }) })
    } else {
      await route.continue()
    }
  })
}

export async function mockCsvImport(page: Page) {
  await page.route('**/users/import-csv', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'CSV import completed', created: 3, updated: 0, skipped: 0, errors: [] }),
    })
  })
}

export async function mockKioskUpdatePin(page: Page) {
  await page.route('**/kiosk/update-pin', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'PIN updated' }),
    })
  })
}

export async function clearAuthState(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
  await page.evaluate(() => {
    try {
      localStorage.removeItem('csrf_token')
      localStorage.removeItem('kiosk_state')
      sessionStorage.clear()
    } catch {
      // localStorage may not be available on some pages
    }
  })
  await page.context().clearCookies()
}

export async function setupKioskTest(page: Page) {
  await clearAuthState(page)
  await mockKioskUnlock(page)
  await mockKioskLock(page)
  await mockPinVerify(page, true, STUDENT_USER)
  await mockBulkCheckIn(page)
}

export async function mockRankTiers(page: Page) {
  await page.route('**/rank-tiers/', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, rank: 'White', degree: 0, display_name: 'White Belt', target_points: 500, sort_order: 0 },
          { id: 6, rank: 'Blue', degree: 0, display_name: 'Blue Belt', target_points: 500, sort_order: 5 },
          { id: 11, rank: 'Purple', degree: 0, display_name: 'Purple Belt', target_points: 500, sort_order: 10 },
          { id: 16, rank: 'Brown', degree: 0, display_name: 'Brown Belt', target_points: 500, sort_order: 15 },
          { id: 21, rank: 'Black', degree: 0, display_name: 'Black Belt', target_points: 500, sort_order: 20 },
        ]),
      })
    } else {
      await route.continue()
    }
  })
}

export async function setupAdminTest(page: Page) {
  await clearAuthState(page)
  await mockAuthLogin(page, ADMIN_USER, ['Admin', 'Teacher'])
  await mockAuthMe(page, ADMIN_USER, ['Admin', 'Teacher'])
  await mockAuthLogout(page)
  await mockUserCreate(page)
  await mockUserUpdate(page)
  await mockClassCreate(page)
  await mockThemeMutations(page)
  await mockNewsMutations(page)
  await mockCsvImport(page)
  await mockKioskUpdatePin(page)
  await mockFeedbackSubmit(page)
  await mockCommentCreate(page)
  await mockRankTiers(page)
}

export async function setupTeacherTest(page: Page) {
  await clearAuthState(page)
  await mockAuthLogin(page, TEACHER_USER, ['Teacher'])
  await mockAuthMe(page, TEACHER_USER, ['Teacher'])
  await mockAuthLogout(page)
  await mockAttendanceConfirm(page)
  await mockAttendanceCancel(page)
  await mockCreateAttendanceDirect(page)
  await mockFeedbackSubmit(page)
  await mockCommentCreate(page)
}

export async function setupStudentPortalTest(page: Page) {
  await clearAuthState(page)
  await mockAuthLogin(page, STUDENT_USER, ['Student'])
  await mockAuthMe(page, STUDENT_USER, ['Student'])
  await mockAuthLogout(page)
  await mockFeedbackSubmit(page)
  await mockCommentCreate(page)
}

export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle')
}

export async function unlockKioskViaUi(page: Page) {
  const staffBtn = page.getByRole('button', { name: /staff sign in/i })
  if (await staffBtn.isVisible({ timeout: 5000 })) {
    await staffBtn.click()
    await page.waitForTimeout(500)
  }
  const emailInput = page.getByPlaceholder('you@example.com')
  if (await emailInput.isVisible({ timeout: 5000 })) {
    await emailInput.fill(E2E_KIOSK_EMAIL)
    await page.getByPlaceholder('Enter your password').fill(E2E_KIOSK_PASSWORD)
    await page.getByRole('button', { name: /unlock/i }).click()
    await page.waitForTimeout(1000)
  }
}

export async function expectVisible(page: Page, text: string) {
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible()
}
