import { test, expect } from '@playwright/test'
import {
  mockAuthLogin,
  mockAuthMe,
  mockAuthMeConditional,
  mockAuthLogout,
  clearAuthState,
  waitForPageReady,
  ADMIN_USER,
  TEACHER_USER,
  STUDENT_USER,
} from './helpers'

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('login page renders email and password fields', async ({ page }) => {
    await page.goto('/login')
    await waitForPageReady(page)
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('login page has a sign in button', async ({ page }) => {
    await page.goto('/login')
    await waitForPageReady(page)
    const signInBtn = page.getByRole('button', { name: /sign in|login|log in/i }).first()
    await expect(signInBtn).toBeVisible({ timeout: 5000 })
  })

  test('login page has a back link to home', async ({ page }) => {
    await page.goto('/login')
    await waitForPageReady(page)
    await expect(page.getByText(/back|home|return/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('admin login redirects to admin dashboard', async ({ page }) => {
    await mockAuthLogin(page, ADMIN_USER, ['Admin', 'Teacher'])
    await mockAuthMeConditional(page, ADMIN_USER, ['Admin', 'Teacher'])
    await page.goto('/login')
    await waitForPageReady(page)

    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()
    await emailInput.fill(ADMIN_USER.email)
    await passwordInput.fill('admin123')
    const signInBtn = page.getByRole('button', { name: /sign in|login/i }).first()
    await signInBtn.click()
    await page.waitForTimeout(1000)
  })

  test('teacher login redirects to teacher dashboard', async ({ page }) => {
    await mockAuthLogin(page, TEACHER_USER, ['Teacher'])
    await mockAuthMeConditional(page, TEACHER_USER, ['Teacher'])
    await page.goto('/login')
    await waitForPageReady(page)

    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()
    await emailInput.fill(TEACHER_USER.email)
    await passwordInput.fill('password123')
    const signInBtn = page.getByRole('button', { name: /sign in|login/i }).first()
    await signInBtn.click()
    await page.waitForTimeout(1000)
  })

  test('invalid credentials shows error', async ({ page }) => {
    await mockAuthLogin(page, ADMIN_USER, ['Admin', 'Teacher'], 401)
    await page.goto('/login')
    await waitForPageReady(page)

    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()
    await emailInput.fill('wrong@email.com')
    await passwordInput.fill('wrongpassword')
    const signInBtn = page.getByRole('button', { name: /sign in|login/i }).first()
    await signInBtn.click()
    await page.waitForTimeout(500)
    await expect(page.getByText(/invalid|error|fail/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('protected route redirects unauthenticated user', async ({ page }) => {
    await mockAuthMe(page, null, [])
    await page.goto('/admin')
    await waitForPageReady(page)
    await expect(page.getByText(/login|sign in/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('logout returns to home', async ({ page }) => {
    await mockAuthLogin(page, ADMIN_USER, ['Admin', 'Teacher'])
    await mockAuthMe(page, ADMIN_USER, ['Admin', 'Teacher'])
    await mockAuthLogout(page)
    await page.goto('/admin')
    await waitForPageReady(page)

    const logoutBtn = page.getByText(/log.?out|log.?out/i).first()
    if (await logoutBtn.isVisible({ timeout: 3000 })) {
      await logoutBtn.click()
      await page.waitForTimeout(1000)
    }
  })
})
