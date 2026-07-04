import { test, expect } from '@playwright/test'
import { E2E_KIOSK_EMAIL, E2E_KIOSK_PASSWORD, E2E_STUDENT_PIN, E2E_API_BASE } from './config'

test.describe('Teacher Bypass Check-In Flow', () => {
  let staffToken: string
  let studentUuid: string
  let attendanceId: number

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
    studentUuid = (await userRes.json()).user.user_uuid
  })

  test('unlock kiosk with staff credentials', async ({ request }) => {
    const res = await request.post(`${E2E_API_BASE}/kiosk/unlock`, {
      data: { email: E2E_KIOSK_EMAIL, password: E2E_KIOSK_PASSWORD },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.access_token).toBeTruthy()
    expect(body.refresh_token).toBeTruthy()
    expect(body.user.email).toBe(E2E_KIOSK_EMAIL)
  })

  test('bulk check-in creates pending attendance', async ({ request }) => {
    const res = await request.post(`${E2E_API_BASE}/attendance/bulk-check-in`, {
      data: { user_uuid: studentUuid, class_ids: [1] },
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.created).toHaveLength(1)
    expect(body.created[0].status).toBe('pending')
    attendanceId = body.created[0].id
  })

  test('confirm pending attendance', async ({ request }) => {
    const res = await request.post(`${E2E_API_BASE}/attendance/${attendanceId}/confirm`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('confirmed')
  })

  test('cancel attendance', async ({ request }) => {
    const res = await request.delete(`${E2E_API_BASE}/attendance/${attendanceId}/cancel`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Attendance cancelled')
  })
})
