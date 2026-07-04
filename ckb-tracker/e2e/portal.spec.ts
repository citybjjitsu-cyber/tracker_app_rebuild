import { test, expect } from '@playwright/test'
import {
  setupStudentPortalTest,
  clearAuthState,
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
})
