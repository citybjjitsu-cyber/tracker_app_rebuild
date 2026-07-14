import { test, expect } from '@playwright/test'
import {
  setupAdminTest,
  mockAuthMe,
  clearAuthState,
  waitForPageReady,
} from './helpers'

test.describe('Navigation', () => {
  test('unauthenticated user sees sign in link in sidebar', async ({ page }) => {
    await clearAuthState(page)
    await mockAuthMe(page, null, [])
    await page.goto('/portal')
    await waitForPageReady(page)
    const signInLink = page.getByText(/sign in|login/i).first()
    await expect(signInLink).toBeVisible({ timeout: 5000 })
  })

  test('authenticated user sees sidebar nav items', async ({ page }) => {
    await setupAdminTest(page)
    await page.goto('/admin')
    await waitForPageReady(page)
    const checkIn = page.getByText(/check in/i).first()
    await expect(checkIn).toBeVisible({ timeout: 5000 })
  })

  test('sidebar shows student portal link', async ({ page }) => {
    await setupAdminTest(page)
    await page.goto('/admin')
    await waitForPageReady(page)
    const portalLink = page.getByText(/student portal/i).first()
    await expect(portalLink).toBeVisible({ timeout: 5000 })
  })

  test('sidebar shows admin link for admin user', async ({ page }) => {
    await setupAdminTest(page)
    await page.goto('/admin')
    await waitForPageReady(page)
    const adminLink = page.getByText(/^admin$/i).first()
    await expect(adminLink).toBeVisible({ timeout: 5000 })
  })

  test('sidebar shows teacher link for admin user', async ({ page }) => {
    await setupAdminTest(page)
    await page.goto('/admin')
    await waitForPageReady(page)
    const teacherLink = page.getByText(/^teacher$/i).first()
    await expect(teacherLink).toBeVisible({ timeout: 5000 })
  })

  test('theme toggle button exists in sidebar', async ({ page }) => {
    await setupAdminTest(page)
    await page.goto('/admin')
    await waitForPageReady(page)
    const themeBtn = page.locator('button').filter({ hasText: /dark|light|mode/i }).first()
    await expect(themeBtn).toBeVisible({ timeout: 5000 })
  })
})
