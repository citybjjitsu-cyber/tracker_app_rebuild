import { test, expect } from '@playwright/test'
import {
  setupTeacherTest,
  waitForPageReady,
} from './helpers'

test.describe('Teacher Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupTeacherTest(page)
    await page.goto('/teacher')
    await waitForPageReady(page)
  })

  test('teacher dashboard loads with heading', async ({ page }) => {
    await expect(page.getByText(/teacher dashboard/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('attendance tab shows confirm attendance section', async ({ page }) => {
    const attendanceTab = page.getByText(/confirm attendance/i).first()
    await expect(attendanceTab).toBeVisible({ timeout: 5000 })
    await attendanceTab.click()
    await page.waitForTimeout(500)
    await expect(page.getByText(/total|pending|confirmed|students/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('roster tab loads', async ({ page }) => {
    const rosterTab = page.getByText(/class roster/i).first()
    if (await rosterTab.isVisible({ timeout: 3000 })) {
      await rosterTab.click()
      await page.waitForTimeout(500)
    }
  })

  test('feedback tab loads', async ({ page }) => {
    const feedbackTab = page.getByText(/^feedback$/i).first()
    if (await feedbackTab.isVisible({ timeout: 3000 })) {
      await feedbackTab.click()
      await page.waitForTimeout(500)
    }
  })

  test('comments tab loads', async ({ page }) => {
    const commentsTab = page.getByText(/^comments$/i).first()
    if (await commentsTab.isVisible({ timeout: 3000 })) {
      await commentsTab.click()
      await page.waitForTimeout(500)
    }
  })
})
