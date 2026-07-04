import { test, expect } from '@playwright/test'

const BASE = 'http://127.0.0.1:8000'

test.describe('Student PIN Flow', () => {
  let staffToken: string

  test.beforeAll(async ({ request }) => {
    for (let i = 0; i < 3; i++) {
      const res = await request.post(`${BASE}/kiosk/unlock`, {
        data: { email: 'kiosk@ckbtracker.com', password: 'kiosk123' },
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

  test('verify valid student PIN returns user and tokens', async ({ request }) => {
    const res = await request.post(`${BASE}/kiosk/verify-user-pin`, {
      data: { pin: '1001' },
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.valid).toBe(true)
    expect(body.user).toBeTruthy()
    expect(body.access_token).toBeTruthy()
  })

  test('verify invalid PIN returns valid false', async ({ request }) => {
    const res = await request.post(`${BASE}/kiosk/verify-user-pin`, {
      data: { pin: '9999' },
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.valid).toBe(false)
    expect(body.user).toBeNull()
  })

  test('verify user pin requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/kiosk/verify-user-pin`, {
      data: { pin: '1234' },
    })
    expect(res.status()).toBe(401)
  })

  test('verify-pin-for-user with valid data', async ({ request }) => {
    const res = await request.post(`${BASE}/kiosk/verify-pin-for-user`, {
      data: { user_uuid: 'student-uuid-0000-0000-000000000002', pin: '1001' },
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.valid).toBe(true)
  })

  test('verify-pin-for-user with invalid pin', async ({ request }) => {
    const res = await request.post(`${BASE}/kiosk/verify-pin-for-user`, {
      data: { user_uuid: 'student-uuid-0000-0000-000000000002', pin: '0000' },
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    expect(res.status()).toBe(200)
    expect((await res.json()).valid).toBe(false)
  })
})
