import { test, expect } from '@playwright/test'

const BASE = 'http://127.0.0.1:8000'

test.describe('PIN Lockout', () => {
  let staffToken: string

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${BASE}/kiosk/unlock`, {
      data: { email: 'staff@test.com', password: 'password123' },
    })
    staffToken = (await res.json()).access_token
  })

  test('3 wrong PINs triggers 429 lockout', async ({ request }) => {
    const headers = { Authorization: `Bearer ${staffToken}` }

    for (let i = 0; i < 3; i++) {
      await request.post(`${BASE}/kiosk/verify-user-pin`, {
        data: { pin: '9999' },
        headers,
      })
    }

    const res = await request.post(`${BASE}/kiosk/verify-user-pin`, {
      data: { pin: '9999' },
      headers,
    })
    expect(res.status()).toBe(429)
  })

  test('429 response includes Retry-After header', async ({ request }) => {
    const headers = { Authorization: `Bearer ${staffToken}` }

    for (let i = 0; i < 3; i++) {
      await request.post(`${BASE}/kiosk/verify-user-pin`, {
        data: { pin: '8888' },
        headers,
      })
    }

    const res = await request.post(`${BASE}/kiosk/verify-user-pin`, {
      data: { pin: '8888' },
      headers,
    })
    expect(res.status()).toBe(429)
    expect(res.headers()['retry-after']).toBeTruthy()
  })
})
