import { test, expect } from '@playwright/test'

const BASE = 'http://127.0.0.1:8000'

test.describe('Teacher Bypass Check-In Flow', () => {
  let staffToken: string
  let attendanceId: number

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

  test('unlock kiosk with staff credentials', async ({ request }) => {
    const res = await request.post(`${BASE}/kiosk/unlock`, {
      data: { email: 'kiosk@ckbtracker.com', password: 'kiosk123' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.access_token).toBeTruthy()
    expect(body.refresh_token).toBeTruthy()
    expect(body.user.email).toBe('kiosk@ckbtracker.com')
  })

  test('bulk check-in creates pending attendance', async ({ request }) => {
    const res = await request.post(`${BASE}/attendance/bulk-check-in`, {
      data: { user_uuid: 'student-uuid-0000-0000-000000000002', class_ids: [1] },
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.created).toHaveLength(1)
    expect(body.created[0].status).toBe('pending')
    attendanceId = body.created[0].id
  })

  test('confirm pending attendance', async ({ request }) => {
    const res = await request.post(`${BASE}/attendance/${attendanceId}/confirm`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('confirmed')
  })

  test('cancel attendance', async ({ request }) => {
    const res = await request.delete(`${BASE}/attendance/${attendanceId}/cancel`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Attendance cancelled')
  })
})
