import { test, expect } from '@playwright/test'
import { E2E_KIOSK_EMAIL, E2E_KIOSK_PASSWORD, E2E_API_BASE } from './config'

test.describe('PIN Lockout', () => {
  let staffToken: string

  test.beforeAll(async ({ request }) => {
    for (let i = 0; i < 3; i++) {
      const res = await request.post(`${E2E_API_BASE}/kiosk/unlock`, {
        data: { email: E2E_KIOSK_EMAIL, password: E2E_KIOSK_PASSWORD },
      })
      if (res.status() === 200) {
        staffToken = (await res.json()).access_token
        return
      }
      if (res.status() === 429) {
        await new Promise(r => setTimeout(r, 2000))
      }
    }
  })

  test('3 wrong PINs triggers 429 lockout', async ({ request }) => {
    const headers = { Authorization: `Bearer ${staffToken}` }

    for (let i = 0; i < 3; i++) {
      await request.post(`${E2E_API_BASE}/kiosk/verify-user-pin`, {
        data: { pin: '9999' },
        headers,
      })
    }

    const res = await request.post(`${E2E_API_BASE}/kiosk/verify-user-pin`, {
      data: { pin: '9999' },
      headers,
    })
    expect(res.status()).toBe(429)
  })

  test('429 response includes Retry-After header', async ({ request }) => {
    const headers = { Authorization: `Bearer ${staffToken}` }

    for (let i = 0; i < 3; i++) {
      await request.post(`${E2E_API_BASE}/kiosk/verify-user-pin`, {
        data: { pin: '8888' },
        headers,
      })
    }

    const res = await request.post(`${E2E_API_BASE}/kiosk/verify-user-pin`, {
      data: { pin: '8888' },
      headers,
    })
    expect(res.status()).toBe(429)
    expect(res.headers()['retry-after']).toBeTruthy()
  })
})
