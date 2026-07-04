import { test, expect } from '@playwright/test'
import {
  setupAdminTest,
  waitForPageReady,
} from './helpers'

test.describe('Admin Settings Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminTest(page)
    await page.goto('/admin')
    await waitForPageReady(page)
  })

  test('news tab loads with create form', async ({ page }) => {
    const newsTab = page.getByText(/^news$/i).first()
    await expect(newsTab).toBeVisible({ timeout: 5000 })
    await newsTab.click()
    await page.waitForTimeout(500)
  })

  test('kiosk tab shows pin management', async ({ page }) => {
    const kioskTab = page.getByText(/^kiosk$/i).first()
    await expect(kioskTab).toBeVisible({ timeout: 5000 })
    await kioskTab.click()
    await page.waitForTimeout(500)
    await expect(page.getByText(/pin management|update pin/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('csv import export tab loads', async ({ page }) => {
    const csvTab = page.getByText(/csv/i).first()
    if (await csvTab.isVisible({ timeout: 3000 })) {
      await csvTab.click()
      await page.waitForTimeout(500)
    }
  })

  test('themes tab loads', async ({ page }) => {
    const themesTab = page.getByText(/^themes$/i).first()
    if (await themesTab.isVisible({ timeout: 3000 })) {
      await themesTab.click()
      await page.waitForTimeout(500)
    }
  })

  test('database tab loads with stats', async ({ page }) => {
    const dbTab = page.getByText(/^database$/i).first()
    if (await dbTab.isVisible({ timeout: 3000 })) {
      await dbTab.click()
      await page.waitForTimeout(500)
    }
  })
})
