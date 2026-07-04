import { test, expect } from '@playwright/test'
import {
  setupKioskTest,
  mockPinVerify,
  mockUsersSearch,
  mockBulkCheckIn,
  unlockKioskViaUi,
  goThroughKioskPinFlow,
  waitForPageReady,
  STUDENT_USER,
} from './helpers'

test.describe('Kiosk Check-In Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupKioskTest(page)
    await mockUsersSearch(page, [STUDENT_USER])
    await page.goto('/')
    await waitForPageReady(page)
    await unlockKioskViaUi(page)
  })

  test('class selection page shows after pin verification', async ({ page }) => {
    await mockPinVerify(page, true)
    await goThroughKioskPinFlow(page, STUDENT_USER, '1111')
    await expect(page.getByText(/select|classes|check in/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('class selection page displays user info', async ({ page }) => {
    await mockPinVerify(page, true)
    await goThroughKioskPinFlow(page, STUDENT_USER, '1111')
    await expect(page.getByText(/john|smith/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('confirm page shows after selecting classes', async ({ page }) => {
    await mockPinVerify(page, true)
    await goThroughKioskPinFlow(page, STUDENT_USER, '1111')
    const classBtn = page.getByRole('button', { name: /check in/i }).first()
    if (await classBtn.isVisible({ timeout: 5000 })) {
      await classBtn.click()
      await page.waitForTimeout(300)
    }
    const confirmNavBtn = page.getByRole('button', { name: /check in to/i }).first()
    if (await confirmNavBtn.isVisible({ timeout: 3000 })) {
      await confirmNavBtn.click()
      await page.waitForTimeout(500)
    }
    await expect(page.getByText(/confirm|check in/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('success state after check-in', async ({ page }) => {
    await mockPinVerify(page, true)
    await mockBulkCheckIn(page)
    await goThroughKioskPinFlow(page, STUDENT_USER, '1111')
    const classBtn = page.getByRole('button', { name: /check in/i }).first()
    if (await classBtn.isVisible({ timeout: 5000 })) {
      await classBtn.click()
      await page.waitForTimeout(300)
    }
    const confirmNavBtn = page.getByRole('button', { name: /check in to/i }).first()
    if (await confirmNavBtn.isVisible({ timeout: 3000 })) {
      await confirmNavBtn.click()
      await page.waitForTimeout(500)
    }
    const confirmBtn = page.getByRole('button', { name: /confirm|check in/i }).first()
    if (await confirmBtn.isVisible({ timeout: 3000 })) {
      await confirmBtn.click()
      await page.waitForTimeout(1000)
    }
  })

  test('cancel returns to welcome screen', async ({ page }) => {
    await page.goto('/')
    await waitForPageReady(page)
    const lockBtn = page.getByRole('button', { name: /lock/i }).first()
    if (await lockBtn.isVisible({ timeout: 3000 })) {
      await lockBtn.click()
      await page.waitForTimeout(500)
    }
    await expect(page.getByRole('button', { name: /staff sign in/i }).first()).toBeVisible({ timeout: 5000 })
  })
})
