import { test, expect } from '@playwright/test'

const BASE = 'http://127.0.0.1:8000'

test.describe('Cancel Pending Check-In', () => {
  let staffToken: string
  let attendanceId: number

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${BASE}/kiosk/unlock`, {
      data: { email: 'staff@test.com', password: 'password123' },
    })
    staffToken = (await res.json()).access_token
  })

  test('cancel nonexistent attendance returns 404', async ({ request }) => {
    const res = await request.delete(`${BASE}/attendance/99999/cancel`)
    expect(res.status()).toBe(404)
  })

  test('create and cancel pending attendance', async ({ request }) => {
    const createRes = await request.post(`${BASE}/attendance/`, {
      data: { user_uuid: 'student-uuid-0000-0000-000000000002', class_id: 1 },
    })
    expect(createRes.status()).toBe(200)
    attendanceId = (await createRes.json()).id

    const cancelRes = await request.delete(`${BASE}/attendance/${attendanceId}/cancel`)
    expect(cancelRes.status()).toBe(200)
    expect((await cancelRes.json()).message).toBe('Attendance cancelled')
  })

  test('cancel already-cancelled attendance returns 404', async ({ request }) => {
    const res = await request.delete(`${BASE}/attendance/${attendanceId}/cancel`)
    expect(res.status()).toBe(404)
  })
})
