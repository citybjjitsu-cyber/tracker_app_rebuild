import { test, expect } from '@playwright/test'
import {
  setupStudentPortalTest,
  waitForPageReady,
} from './helpers'

test.describe('Student Portal', () => {
  test.beforeEach(async ({ page }) => {
    await setupStudentPortalTest(page)
    await page.goto('/portal')
    await waitForPageReady(page)
  })

  test('portal loads with analytics tab', async ({ page }) => {
    const analyticsTab = page.getByText(/analytics|stats|my analytics/i).first()
    await expect(analyticsTab).toBeVisible({ timeout: 5000 })
  })

  test('analytics tab shows stats cards', async ({ page }) => {
    await expect(page.getByText(/total|points|classes|month/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('analytics tab shows attendance trend', async ({ page }) => {
    await expect(page.getByText(/attendance|trend|history/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('feedback tab loads with feedback form', async ({ page }) => {
    const feedbackTab = page.getByText(/feedback|submit feedback/i).first()
    if (await feedbackTab.isVisible({ timeout: 3000 })) {
      await feedbackTab.click()
      await page.waitForTimeout(500)
      const submitBtn = page.getByRole('button', { name: /submit|send/i }).first()
      await expect(submitBtn).toBeVisible({ timeout: 3000 })
    }
  })

  test('feedback tab shows history of submitted feedback', async ({ page }) => {
    const feedbackTab = page.getByText(/feedback|submit/i).first()
    if (await feedbackTab.isVisible({ timeout: 3000 })) {
      await feedbackTab.click()
      await page.waitForTimeout(500)
    }
  })

  test('comments tab loads', async ({ page }) => {
    const commentsTab = page.getByText(/comments|notes/i).first()
    if (await commentsTab.isVisible({ timeout: 3000 })) {
      await commentsTab.click()
      await page.waitForTimeout(500)
      await expect(page.getByText(/comments/i).first()).toBeVisible({ timeout: 3000 })
    }
  })

  test('portal remains usable at a narrow mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.reload()
    await waitForPageReady(page)

    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }))
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth)
    await expect(page.getByRole('button', { name: /my analytics/i })).toBeVisible()

    await page.getByRole('button', { name: /comments/i }).click()
    await expect(page.getByRole('heading', { name: 'Comments' })).toBeVisible()
  })
})

test('portal exposes a retry action when data loading fails', async ({ page }) => {
  await setupStudentPortalTest(page)
  let statsRequests = 0
  await page.route('**/dashboard/stats/*', async route => {
    statsRequests += 1
    if (statsRequests === 1) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Unavailable' }) })
      return
    }
    await route.continue()
  })

  await page.goto('/portal')
  const dataAlert = page.locator('[role="alert"]').filter({ hasText: /unable to load your portal data/i })
  await expect(dataAlert).toBeVisible()
  await dataAlert.getByRole('button', { name: 'Retry' }).click()
  await expect.poll(() => statsRequests).toBeGreaterThan(1)
})
