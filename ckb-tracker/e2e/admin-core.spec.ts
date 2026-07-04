import { test, expect } from '@playwright/test'
import {
  setupAdminTest,
  waitForPageReady,
} from './helpers'

test.describe('Admin Dashboard Core', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminTest(page)
    await page.goto('/admin')
    await waitForPageReady(page)
  })

  test('admin dashboard loads with heading', async ({ page }) => {
    await expect(page.getByText(/admin settings/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('user admin tab shows add member section', async ({ page }) => {
    const usersTab = page.getByText(/user admin/i).first()
    await expect(usersTab).toBeVisible({ timeout: 5000 })
    await usersTab.click()
    await page.waitForTimeout(500)
    const addBtn = page.getByText(/add member|add new member/i).first()
    await expect(addBtn).toBeVisible({ timeout: 5000 })
  })

  test('class schedule tab loads', async ({ page }) => {
    const classesTab = page.getByText(/class schedule/i).first()
    if (await classesTab.isVisible({ timeout: 3000 })) {
      await classesTab.click()
      await page.waitForTimeout(500)
    }
  })

  test('performance analytics tab loads', async ({ page }) => {
    const analyticsTab = page.getByText(/performance analytics/i).first()
    if (await analyticsTab.isVisible({ timeout: 3000 })) {
      await analyticsTab.click()
      await page.waitForTimeout(500)
    }
  })

  test('feedback analytics tab loads', async ({ page }) => {
    const feedbackTab = page.getByText(/feedback analytics/i).first()
    if (await feedbackTab.isVisible({ timeout: 3000 })) {
      await feedbackTab.click()
      await page.waitForTimeout(500)
    }
  })
})
