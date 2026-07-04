import { test, expect } from '@playwright/test'

const BASE = 'http://127.0.0.1:8000'

test.describe('Cancel Pending Check-In', () => {
  let staffToken: string
  let studentUuid: string
  let attendanceId: number

  test.beforeAll(async ({ request }) => {
    for (let i = 0; i < 3; i++) {
      const res = await request.post(`${BASE}/kiosk/unlock`, {
        data: { email: 'kiosk@ckbtracker.com', password: 'kiosk123' },
      })
      if (res.status() === 200) {
        staffToken = (await res.json()).access_token
        break
      }
      if (res.status() === 429) {
        await new Promise(r => setTimeout(r, 2000))
      }
    }

    const userRes = await request.post(`${BASE}/kiosk/verify-user-pin`, {
      data: { pin: '1001' },
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    studentUuid = (await userRes.json()).user.user_uuid
  })

  test('cancel nonexistent attendance returns 404', async ({ request }) => {
    const res = await request.delete(`${BASE}/attendance/99999/cancel`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    expect(res.status()).toBe(404)
  })

  test('create and cancel pending attendance', async ({ request }) => {
    const createRes = await request.post(`${BASE}/attendance/`, {
      data: { user_uuid: studentUuid, class_id: 1 },
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    expect(createRes.status()).toBe(200)
    attendanceId = (await createRes.json()).id

    const cancelRes = await request.delete(`${BASE}/attendance/${attendanceId}/cancel`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    expect(cancelRes.status()).toBe(200)
    expect((await cancelRes.json()).message).toBe('Attendance cancelled')
  })

  test('cancel already-cancelled attendance returns 404', async ({ request }) => {
    const res = await request.delete(`${BASE}/attendance/${attendanceId}/cancel`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    expect(res.status()).toBe(404)
  })
})
