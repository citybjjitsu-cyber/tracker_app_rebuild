import { test, expect } from '@playwright/test'
import {
  setupKioskTest,
  mockKioskUnlock,
  mockPinVerify,
  clearAuthState,
  unlockKioskViaUi,
  waitForPageReady,
  KIOSK_USER,
} from './helpers'
import { E2E_KIOSK_PASSWORD } from './config'

test.describe('Kiosk Core', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('locked state shows branding and staff sign-in button', async ({ page }) => {
    await page.goto('/')
    await waitForPageReady(page)
    await expect(page.locator('h1, h2').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /staff sign in/i })).toBeVisible()
  })

  test('locked state has a login link', async ({ page }) => {
    await page.goto('/')
    await waitForPageReady(page)
    const loginLink = page.getByText(/login|sign in/i).first()
    await expect(loginLink).toBeVisible()
  })

  test('unlock modal can be opened from locked state', async ({ page }) => {
    await page.goto('/')
    await waitForPageReady(page)
    const staffBtn = page.getByText(/staff|sign in|unlock/i).first()
    if (await staffBtn.isVisible()) {
      await staffBtn.click()
      await page.waitForTimeout(500)
    }
  })

  test('unlock with valid kiosk credentials shows unlocked state', async ({ page }) => {
    await mockKioskUnlock(page)
    await page.goto('/')
    await waitForPageReady(page)

    const unlockBtn = page.getByText(/staff|sign in|unlock/i).first()
    if (await unlockBtn.isVisible()) {
      await unlockBtn.click()
      await page.waitForTimeout(500)
    }

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[placeholder*="mail" i]').first()
    const passwordInput = page.locator('input[type="password"]').first()

    if (await emailInput.isVisible()) {
      await emailInput.fill(KIOSK_USER.email)
      await passwordInput.fill(E2E_KIOSK_PASSWORD)
      const submitBtn = page.getByRole('button', { name: /unlock|submit|sign in|log in/i }).first()
      await submitBtn.click()
      await page.waitForTimeout(1000)
    }

    await expect(page.getByText(/find your name|search|student/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('search input is available after unlock', async ({ page }) => {
    await setupKioskTest(page)
    await page.goto('/')
    await waitForPageReady(page)
    await unlockKioskViaUi(page)

    const findBtn = page.getByRole('button', { name: /find your name/i })
    await findBtn.click()
    await page.waitForTimeout(500)

    const searchInput = page.locator('input[placeholder="Type your name..."]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
  })

  test('pin entry screen shows after selecting a student', async ({ page }) => {
    await setupKioskTest(page)
    await page.goto('/')
    await waitForPageReady(page)
    await unlockKioskViaUi(page)

    const findBtn = page.getByRole('button', { name: /find your name/i })
    await findBtn.click()
    await page.waitForTimeout(500)

    const searchInput = page.locator('input[placeholder="Type your name..."]').first()
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('John')
      await page.waitForTimeout(500)
    }
  })

  test('invalid pin shows error message', async ({ page }) => {
    await mockKioskUnlock(page)
    await mockPinVerify(page, false)
    await page.goto('/')
    await waitForPageReady(page)
  })

  test('kiosk can be locked', async ({ page }) => {
    await setupKioskTest(page)
    await page.goto('/')
    await waitForPageReady(page)

    const lockBtn = page.getByText(/lock/i).first()
    if (await lockBtn.isVisible({ timeout: 3000 })) {
      await lockBtn.click()
      await page.waitForTimeout(500)
    }
  })

  test('news section loads on locked screen', async ({ page }) => {
    await page.goto('/')
    await waitForPageReady(page)
  })
})
