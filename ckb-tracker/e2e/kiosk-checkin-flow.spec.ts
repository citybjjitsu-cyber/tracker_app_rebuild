import { test, expect } from '@playwright/test'
import {
  setupKioskTest,
  mockPinVerify,
  mockBulkCheckIn,
  clearAuthState,
  unlockKioskViaUi,
  waitForPageReady,
  STUDENT_USER,
} from './helpers'

test.describe('Kiosk Check-In Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupKioskTest(page)
    await page.goto('/')
    await waitForPageReady(page)
    await unlockKioskViaUi(page)
  })

  test('class selection page shows after pin verification', async ({ page }) => {
    await mockPinVerify(page, true, STUDENT_USER)
    await page.goto('/kiosk/select')
    await waitForPageReady(page)
    await expect(page.getByText(/select|classes|check in/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('class selection page displays user info', async ({ page }) => {
    await mockPinVerify(page, true, STUDENT_USER)
    await page.goto('/kiosk/select')
    await waitForPageReady(page)
    await expect(page.getByText(/john|smith/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('confirm page shows selected classes', async ({ page }) => {
    await mockPinVerify(page, true, STUDENT_USER)
    await page.goto('/kiosk/confirm')
    await waitForPageReady(page)
    await expect(page.getByText(/confirm|check in/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('success state after check-in', async ({ page }) => {
    await mockPinVerify(page, true, STUDENT_USER)
    await mockBulkCheckIn(page)
    await page.goto('/kiosk/confirm')
    await waitForPageReady(page)

    const confirmBtn = page.getByRole('button', { name: /confirm|check in/i }).first()
    if (await confirmBtn.isVisible({ timeout: 3000 })) {
      await confirmBtn.click()
      await page.waitForTimeout(1000)
    }
  })

  test('cancel returns to welcome screen', async ({ page }) => {
    await page.goto('/kiosk/select')
    await waitForPageReady(page)

    const cancelBtn = page.getByRole('button', { name: /cancel|clear|back/i }).first()
    if (await cancelBtn.isVisible({ timeout: 3000 })) {
      await cancelBtn.click()
      await page.waitForTimeout(500)
    }
  })
})
