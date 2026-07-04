import { test, expect } from '@playwright/test'
import { E2E_KIOSK_EMAIL, E2E_KIOSK_PASSWORD, E2E_STUDENT_PIN, E2E_API_BASE } from './config'

test.describe('Student PIN Flow', () => {
  let staffToken: string
  let studentUuid: string

  test.beforeAll(async ({ request }) => {
    for (let i = 0; i < 3; i++) {
      const res = await request.post(`${E2E_API_BASE}/kiosk/unlock`, {
        data: { email: E2E_KIOSK_EMAIL, password: E2E_KIOSK_PASSWORD },
      })
      if (res.status() === 200) {
        staffToken = (await res.json()).access_token
        break
      }
      if (res.status() === 429) {
        await new Promise(r => setTimeout(r, 2000))
      }
    }

    const userRes = await request.post(`${E2E_API_BASE}/kiosk/verify-user-pin`, {
      data: { pin: E2E_STUDENT_PIN },
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    const body = await userRes.json()
    studentUuid = body.user.user_uuid
  })

  test('verify valid student PIN returns user and tokens', async ({ request }) => {
    const res = await request.post(`${E2E_API_BASE}/kiosk/verify-user-pin`, {
      data: { pin: E2E_STUDENT_PIN },
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.valid).toBe(true)
    expect(body.user).toBeTruthy()
    expect(body.access_token).toBeTruthy()
  })

  test('verify invalid PIN returns valid false', async ({ request }) => {
    const res = await request.post(`${E2E_API_BASE}/kiosk/verify-user-pin`, {
      data: { pin: '9999' },
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.valid).toBe(false)
    expect(body.user).toBeNull()
  })

  test('verify user pin requires auth', async ({ request }) => {
    const res = await request.post(`${E2E_API_BASE}/kiosk/verify-user-pin`, {
      data: { pin: '1234' },
    })
    expect(res.status()).toBe(401)
  })

  test('verify-pin-for-user with valid data', async ({ request }) => {
    const res = await request.post(`${E2E_API_BASE}/kiosk/verify-pin-for-user`, {
      data: { user_uuid: studentUuid, pin: E2E_STUDENT_PIN },
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.valid).toBe(true)
  })

  test('verify-pin-for-user with invalid pin', async ({ request }) => {
    const res = await request.post(`${E2E_API_BASE}/kiosk/verify-pin-for-user`, {
      data: { user_uuid: studentUuid, pin: '0000' },
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    expect(res.status()).toBe(200)
    expect((await res.json()).valid).toBe(false)
  })
})
