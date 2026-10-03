import { test, expect } from '@playwright/test'
import { setupTeacherTest, waitForPageReady } from './helpers'

test.describe('Mobile API integration verification', () => {
  test('teacher mobile schedule renders the normalized weekly response', async ({ page }) => {
    await setupTeacherTest(page)
    await page.setViewportSize({ width: 375, height: 812 })

    const weeklyRequests: string[] = []
    page.on('request', request => {
      if (request.url().includes('/classes/weekly')) weeklyRequests.push(request.url())
    })

    await page.goto('/teacher')
    await waitForPageReady(page)

    await expect(page.getByText(/teacher dashboard/i).first()).toBeVisible()
    await expect(page.locator('button:visible', { hasText: 'Test Class' }).first()).toBeVisible()
    expect(weeklyRequests.length).toBeGreaterThan(0)
  })

  test('teacher schedule exposes retry after a weekly API failure', async ({ page }) => {
    await setupTeacherTest(page)
    let weeklyRequests = 0
    await page.route('**/classes/weekly*', async route => {
      weeklyRequests += 1
      if (weeklyRequests === 1) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Schedule unavailable' }),
        })
        return
      }
      await route.fallback()
    })

    await page.goto('/teacher')
    const alert = page.locator('[role="alert"]').filter({ hasText: /unable to load the class schedule/i })
    await expect(alert).toBeVisible()
    await alert.getByRole('button', { name: 'Retry' }).click()
    await expect(page.locator('button:visible', { hasText: 'Test Class' }).first()).toBeVisible()
    expect(weeklyRequests).toBeGreaterThan(1)
  })
})
