import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
    },
    defaults: {},
  }
  return { default: mockAxios }
})

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  sessionStorage.clear()
  localStorage.clear()
})

describe('kioskApi', () => {
  it('unlock stores staff token in memory', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({
      data: { access_token: 'test-token', refresh_token: 'test-refresh' },
    })

    const result = await apiModule.kioskApi.unlock('staff@test.com', 'pass123')

    expect(result.access_token).toBe('test-token')
    expect(apiModule.getKioskStaffToken()).toBe('test-token')
  }, 10000)

  it('lock clears staff token', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    apiModule.setKioskStaffToken('some-token')
    vi.mocked(axios.default.post).mockResolvedValue({
      data: { message: 'Kiosk locked' },
    })

    const result = await apiModule.kioskApi.lock()

    expect(result.message).toBe('Kiosk locked')
    expect(apiModule.getKioskStaffToken()).toBeNull()
  }, 10000)

  it('verifyUserPin calls POST /kiosk/verify-user-pin', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({
      data: {
        valid: true,
        user: { first_name: 'Student' },
        access_token: 'access-123',
        refresh_token: 'refresh-123',
        csrf_token: 'csrf-123',
      },
    })

    const result = await apiModule.kioskApi.verifyUserPin('1234')

    expect(result.valid).toBe(true)
    expect(axios.default.post).toHaveBeenCalledWith('/kiosk/verify-user-pin', { pin: '1234' })
  })
})

describe('attendanceApi', () => {
  it('bulkCheckIn posts correct payload', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({
      data: { created: [{ id: 1, class_id: 1, status: 'pending' }], errors: [] },
    })

    const result = await apiModule.attendanceApi.bulkCheckIn('user-uuid', [1, 2])

    expect(axios.default.post).toHaveBeenCalledWith(
      '/attendance/bulk-check-in',
      { user_uuid: 'user-uuid', class_ids: [1, 2] },
    )
    expect(result.created).toHaveLength(1)
  })

  it('confirm posts to correct endpoint', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({
      data: { id: 1, status: 'confirmed' },
    })

    const result = await apiModule.attendanceApi.confirm(1)

    expect(axios.default.post).toHaveBeenCalledWith('/attendance/1/confirm')
    expect(result.status).toBe('confirmed')
  })

  it('cancel deletes correct endpoint', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.delete).mockResolvedValue({
      data: { message: 'Attendance cancelled' },
    })

    const result = await apiModule.attendanceApi.cancel(1)

    expect(axios.default.delete).toHaveBeenCalledWith('/attendance/1/cancel')
    expect(result.message).toBe('Attendance cancelled')
  })
})

describe('usersApi', () => {
  it('search calls correct endpoint', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({
      data: [{ user_uuid: 'u1', first_name: 'John' }],
    })

    const result = await apiModule.usersApi.search('john')

    expect(axios.default.get).toHaveBeenCalledWith(
      expect.stringContaining('/users/search?query=john'),
    )
    expect(result).toHaveLength(1)
  })
})

describe('authApi', () => {
  it('login calls POST /auth/login', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { access_token: 't1' } })
    const result = await apiModule.authApi.login('a@b.com', 'pwd')

    expect(axios.default.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'pwd' })
    expect(result.access_token).toBe('t1')
  })

  it('teacherLogin calls POST /auth/teacher-login', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { access_token: 't1' } })
    const result = await apiModule.authApi.teacherLogin('a@b.com', 'pwd')

    expect(axios.default.post).toHaveBeenCalledWith('/auth/teacher-login', { email: 'a@b.com', password: 'pwd' })
    expect(result.access_token).toBe('t1')
  })

  it('verifySession calls POST /auth/verify-session', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { valid: true } })
    const result = await apiModule.authApi.verifySession()

    expect(axios.default.post).toHaveBeenCalledWith('/auth/verify-session')
    expect(result.valid).toBe(true)
  })

  it('checkPassword calls GET /auth/check-password/{uuid}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: { has_password: true } })
    const result = await apiModule.authApi.checkPassword('uuid-123')

    expect(axios.default.get).toHaveBeenCalledWith('/auth/check-password/uuid-123')
    expect(result.has_password).toBe(true)
  })

  it('changePassword calls POST /auth/change-password', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { message: 'Password changed successfully' } })
    const result = await apiModule.authApi.changePassword('OldP@ss1', 'NewP@ss2!')

    expect(axios.default.post).toHaveBeenCalledWith('/auth/change-password', {
      current_password: 'OldP@ss1',
      new_password: 'NewP@ss2!',
    })
    expect(result.message).toBe('Password changed successfully')
  })
})

describe('classesApi', () => {
  it('list calls GET /classes/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ id: 1, name: 'Test Class' }] })
    const result = await apiModule.classesApi.list()

    expect(axios.default.get).toHaveBeenCalledWith('/classes/')
    expect(result).toHaveLength(1)
  })

  it('get calls GET /classes/{id}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: { id: 42, name: 'Karate' } })
    const result = await apiModule.classesApi.get(42)

    expect(axios.default.get).toHaveBeenCalledWith('/classes/42')
    expect(result.name).toBe('Karate')
  })

  it('create calls POST /classes/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { id: 1, name: 'New Class' } })
    const result = await apiModule.classesApi.create({ name: 'New Class' })

    expect(axios.default.post).toHaveBeenCalledWith('/classes/', { name: 'New Class' })
    expect(result.name).toBe('New Class')
  })

  it('update calls PUT /classes/{uuid}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.put).mockResolvedValue({ data: { uuid: 'u1', name: 'Updated' } })
    const result = await apiModule.classesApi.update('u1', { name: 'Updated' })

    expect(axios.default.put).toHaveBeenCalledWith('/classes/u1', { name: 'Updated' })
    expect(result.name).toBe('Updated')
  })
})

describe('classInstancesApi', () => {
  it('list calls GET /class-instances/ with optional params', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ id: 1, date: '2026-01-01' }] })
    const result = await apiModule.classInstancesApi.list({ class_id: 5, date: '2026-01-01' })

    expect(axios.default.get).toHaveBeenCalledWith('/class-instances/', { params: { class_id: 5, date: '2026-01-01' } })
    expect(result).toHaveLength(1)
  })

  it('getByDate calls GET /class-instances/by-date/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: { id: 1, class_id: 5, date: '2026-01-01' } })
    const result = await apiModule.classInstancesApi.getByDate(5, '2026-01-01')

    expect(axios.default.get).toHaveBeenCalledWith('/class-instances/by-date/?class_id=5&date=2026-01-01')
    expect(result.class_id).toBe(5)
  })

  it('create calls POST /class-instances/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { id: 1, class_id: 5 } })
    const result = await apiModule.classInstancesApi.create({ class_id: 5, date: '2026-01-01' })

    expect(axios.default.post).toHaveBeenCalledWith('/class-instances/', { class_id: 5, date: '2026-01-01' })
    expect(result.id).toBe(1)
  })

  it('update calls PUT /class-instances/{id}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.put).mockResolvedValue({ data: { id: 1, status: 'completed' } })
    const result = await apiModule.classInstancesApi.update(1, { status: 'completed' })

    expect(axios.default.put).toHaveBeenCalledWith('/class-instances/1', { status: 'completed' })
    expect(result.status).toBe('completed')
  })
})

describe('feedbackApi', () => {
  it('submit calls POST /feedback/ with rating and comment', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { id: 1, rating: 'great' } })
    const result = await apiModule.feedbackApi.submit(1, 'great', 'Nice class')

    expect(axios.default.post).toHaveBeenCalledWith('/feedback/', {
      attendance_id: 1, rating: 'great', comment: 'Nice class',
    })
    expect(result.rating).toBe('great')
  })

  it('getByUser calls GET /feedback/user/{uuid}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ rating: 'great' }] })
    const result = await apiModule.feedbackApi.getByUser('user-u1')

    expect(axios.default.get).toHaveBeenCalledWith('/feedback/user/user-u1')
    expect(result).toHaveLength(1)
  })

  it('getByTeacher calls GET /feedback/teacher/{uuid}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ rating: 'good' }] })
    const result = await apiModule.feedbackApi.getByTeacher('teacher-u1')

    expect(axios.default.get).toHaveBeenCalledWith('/feedback/teacher/teacher-u1')
    expect(result).toHaveLength(1)
  })

  it('getAdminStats calls GET /feedback/admin/comprehensive-stats', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: { avg_rating: 4.5, total: 10 } })
    const result = await apiModule.feedbackApi.getAdminStats({ start_date: '2026-01-01' })

    expect(axios.default.get).toHaveBeenCalledWith('/feedback/admin/comprehensive-stats', {
      params: { start_date: '2026-01-01' },
    })
    expect(result.avg_rating).toBe(4.5)
  })

  it('getAdminList calls GET /feedback/admin/list', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ rating: 'great' }] })
    const result = await apiModule.feedbackApi.getAdminList()

    expect(axios.default.get).toHaveBeenCalledWith('/feedback/admin/list', { params: undefined })
    expect(result).toHaveLength(1)
  })
})

describe('rolesApi', () => {
  it('list calls GET /roles/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ id: 1, name: 'admin' }] })
    const result = await apiModule.rolesApi.list()

    expect(axios.default.get).toHaveBeenCalledWith('/roles/')
    expect(result).toHaveLength(1)
  })

  it('getUserRoles calls GET /roles/user/{uuid}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ role: 'admin' }] })
    const result = await apiModule.rolesApi.getUserRoles('user-u1')

    expect(axios.default.get).toHaveBeenCalledWith('/roles/user/user-u1')
    expect(result).toHaveLength(1)
  })

  it('updateUserRoles calls PUT /roles/user/{uuid} with role_ids', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.put).mockResolvedValue({ data: { message: 'updated' } })
    const result = await apiModule.rolesApi.updateUserRoles('user-u1', [1, 2])

    expect(axios.default.put).toHaveBeenCalledWith('/roles/user/user-u1', { role_ids: [1, 2] })
    expect(result.message).toBe('updated')
  })

  it('getUsersByRole calls GET /roles/users/by-role/{role}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ user_uuid: 'u1' }] })
    const result = await apiModule.rolesApi.getUsersByRole('student')

    expect(axios.default.get).toHaveBeenCalledWith('/roles/users/by-role/student')
    expect(result).toHaveLength(1)
  })
})

describe('termsApi', () => {
  it('list calls GET /terms/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ id: 1, name: 'Spring 2026' }] })
    const result = await apiModule.termsApi.list()

    expect(axios.default.get).toHaveBeenCalledWith('/terms/')
    expect(result).toHaveLength(1)
  })

  it('create calls POST /terms/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { id: 1, name: 'Spring 2026' } })
    const result = await apiModule.termsApi.create({ name: 'Spring 2026' })

    expect(axios.default.post).toHaveBeenCalledWith('/terms/', { name: 'Spring 2026' })
    expect(result.name).toBe('Spring 2026')
  })
})

describe('termTargetsApi', () => {
  it('list calls GET /terms/term-targets/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ id: 1, target: 10 }] })
    const result = await apiModule.termTargetsApi.list()

    expect(axios.default.get).toHaveBeenCalledWith('/terms/term-targets/')
    expect(result).toHaveLength(1)
  })

  it('create calls POST /terms/term-targets/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { id: 1, target: 10 } })
    const result = await apiModule.termTargetsApi.create({ target: 10 })

    expect(axios.default.post).toHaveBeenCalledWith('/terms/term-targets/', { target: 10 })
    expect(result.target).toBe(10)
  })
})

describe('curriculaApi', () => {
  it('list calls GET /curricula/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ id: 1, name: 'White Belt' }] })
    const result = await apiModule.curriculaApi.list()

    expect(axios.default.get).toHaveBeenCalledWith('/curricula/')
    expect(result).toHaveLength(1)
  })

  it('create calls POST /curricula/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { id: 1, name: 'White Belt' } })
    const result = await apiModule.curriculaApi.create({ name: 'White Belt' })

    expect(axios.default.post).toHaveBeenCalledWith('/curricula/', { name: 'White Belt' })
    expect(result.name).toBe('White Belt')
  })
})

describe('lessonsApi', () => {
  it('list calls GET /lessons/ with optional curriculum_id', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ id: 1, title: 'Lesson 1' }] })
    const result = await apiModule.lessonsApi.list(5)

    expect(axios.default.get).toHaveBeenCalledWith('/lessons/', { params: { curriculum_id: 5 } })
    expect(result).toHaveLength(1)
  })

  it('create calls POST /lessons/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { id: 1, title: 'New Lesson' } })
    const result = await apiModule.lessonsApi.create({ title: 'New Lesson', curriculum_id: 1 })

    expect(axios.default.post).toHaveBeenCalledWith('/lessons/', { title: 'New Lesson', curriculum_id: 1 })
    expect(result.title).toBe('New Lesson')
  })

  it('update calls PUT /lessons/{id}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.put).mockResolvedValue({ data: { id: 1, title: 'Updated' } })
    const result = await apiModule.lessonsApi.update(1, { title: 'Updated' })

    expect(axios.default.put).toHaveBeenCalledWith('/lessons/1', { title: 'Updated' })
    expect(result.title).toBe('Updated')
  })

  it('delete calls DELETE /lessons/{id}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.delete).mockResolvedValue({ data: { message: 'deleted' } })
    const result = await apiModule.lessonsApi.delete(1)

    expect(axios.default.delete).toHaveBeenCalledWith('/lessons/1')
    expect(result.message).toBe('deleted')
  })
})

describe('gymLocationsApi', () => {
  it('list calls GET /gym-locations/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ id: 1, name: 'Main Gym' }] })
    const result = await apiModule.gymLocationsApi.list()

    expect(axios.default.get).toHaveBeenCalledWith('/gym-locations/')
    expect(result).toHaveLength(1)
  })

  it('create calls POST /gym-locations/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { id: 1, name: 'Main Gym' } })
    const result = await apiModule.gymLocationsApi.create({ name: 'Main Gym' })

    expect(axios.default.post).toHaveBeenCalledWith('/gym-locations/', { name: 'Main Gym' })
    expect(result.name).toBe('Main Gym')
  })
})

describe('classTypesApi', () => {
  it('list calls GET /class-types/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ id: 1, name: 'Beginners' }] })
    const result = await apiModule.classTypesApi.list()

    expect(axios.default.get).toHaveBeenCalledWith('/class-types/')
    expect(result).toHaveLength(1)
  })

  it('create calls POST /class-types/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { id: 1, name: 'Beginners' } })
    const result = await apiModule.classTypesApi.create({ name: 'Beginners' })

    expect(axios.default.post).toHaveBeenCalledWith('/class-types/', { name: 'Beginners' })
    expect(result.name).toBe('Beginners')
  })
})

describe('dashboardApi', () => {
  it('getStats calls GET /dashboard/stats/{uuid}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: { total_classes: 42, rank: 'blue' } })
    const result = await apiModule.dashboardApi.getStats('user-u1')

    expect(axios.default.get).toHaveBeenCalledWith('/dashboard/stats/user-u1')
    expect(result.total_classes).toBe(42)
  })

  it('getAttendanceTrend calls GET /dashboard/attendance-trend/{uuid}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ month: 'Jan', count: 5 }] })
    const result = await apiModule.dashboardApi.getAttendanceTrend('user-u1', 30)

    expect(axios.default.get).toHaveBeenCalledWith('/dashboard/attendance-trend/user-u1?days=30')
    expect(result).toHaveLength(1)
  })
})

describe('newsApi', () => {
  it('list calls GET /news/ with published_only param', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ id: 1, title: 'News' }] })
    const result = await apiModule.newsApi.list(true)

    expect(axios.default.get).toHaveBeenCalledWith('/news/', { params: { published_only: true } })
    expect(result).toHaveLength(1)
  })

  it('get calls GET /news/{id}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: { id: 5, title: 'Hello' } })
    const result = await apiModule.newsApi.get(5)

    expect(axios.default.get).toHaveBeenCalledWith('/news/5')
    expect(result.title).toBe('Hello')
  })

  it('create calls POST /news/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { id: 1, title: 'New Post' } })
    const result = await apiModule.newsApi.create({ title: 'New Post', content: '...', is_published: true })

    expect(axios.default.post).toHaveBeenCalledWith('/news/', { title: 'New Post', content: '...', is_published: true })
    expect(result.title).toBe('New Post')
  })

  it('update calls PUT /news/{id}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.put).mockResolvedValue({ data: { id: 1, title: 'Updated' } })
    const result = await apiModule.newsApi.update(1, { title: 'Updated' })

    expect(axios.default.put).toHaveBeenCalledWith('/news/1', { title: 'Updated' })
    expect(result.title).toBe('Updated')
  })

  it('delete calls DELETE /news/{id}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.delete).mockResolvedValue({ data: { message: 'deleted' } })
    const result = await apiModule.newsApi.delete(1)

    expect(axios.default.delete).toHaveBeenCalledWith('/news/1')
    expect(result.message).toBe('deleted')
  })
})

describe('themesApi', () => {
  it('list calls GET /themes/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ id: 1, name: 'Dark' }] })
    const result = await apiModule.themesApi.list()

    expect(axios.default.get).toHaveBeenCalledWith('/themes/')
    expect(result).toHaveLength(1)
  })

  it('getActive calls GET /themes/active', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: { id: 1, name: 'Dark', is_active: true } })
    const result = await apiModule.themesApi.getActive()

    expect(axios.default.get).toHaveBeenCalledWith('/themes/active')
    expect(result.is_active).toBe(true)
  })

  it('get calls GET /themes/{id}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: { id: 3, name: 'Light' } })
    const result = await apiModule.themesApi.get(3)

    expect(axios.default.get).toHaveBeenCalledWith('/themes/3')
    expect(result.name).toBe('Light')
  })

  it('create calls POST /themes/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { id: 1, name: 'New Theme' } })
    const result = await apiModule.themesApi.create({ name: 'New Theme', config: '{}' })

    expect(axios.default.post).toHaveBeenCalledWith('/themes/', { name: 'New Theme', config: '{}' })
    expect(result.name).toBe('New Theme')
  })

  it('update calls PUT /themes/{id}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.put).mockResolvedValue({ data: { id: 1, name: 'Updated' } })
    const result = await apiModule.themesApi.update(1, { name: 'Updated' })

    expect(axios.default.put).toHaveBeenCalledWith('/themes/1', { name: 'Updated' })
    expect(result.name).toBe('Updated')
  })

  it('delete calls DELETE /themes/{id}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.delete).mockResolvedValue({ data: { message: 'deleted' } })
    const result = await apiModule.themesApi.delete(1)

    expect(axios.default.delete).toHaveBeenCalledWith('/themes/1')
    expect(result.message).toBe('deleted')
  })

  it('apply calls POST /themes/{id}/apply', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { id: 1, is_active: true } })
    const result = await apiModule.themesApi.apply(1)

    expect(axios.default.post).toHaveBeenCalledWith('/themes/1/apply')
    expect(result.is_active).toBe(true)
  })
})

describe('commentsApi', () => {
  it('create calls POST /comments/ with author_uuid param', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { id: 'c1', content: 'Nice' } })
    const result = await apiModule.commentsApi.create({ content: 'Nice' }, 'author-u1')

    expect(axios.default.post).toHaveBeenCalledWith(
      '/comments/',
      { content: 'Nice' },
      { params: { author_uuid: 'author-u1' } },
    )
    expect(result.content).toBe('Nice')
  })

  it('getFeed calls GET /comments/feed with user_uuid param', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ id: 'c1', content: 'Hello' }] })
    const result = await apiModule.commentsApi.getFeed('user-u1', 'student')

    expect(axios.default.get).toHaveBeenCalledWith('/comments/feed', {
      params: { user_uuid: 'user-u1', role: 'student' },
    })
    expect(result).toHaveLength(1)
  })

  it('get calls GET /comments/{commentUuid}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: { id: 'c1', content: 'Hi' } })
    const result = await apiModule.commentsApi.get('c1')

    expect(axios.default.get).toHaveBeenCalledWith('/comments/c1')
    expect(result.content).toBe('Hi')
  })

  it('update calls PUT /comments/{commentUuid} with author_uuid param', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.put).mockResolvedValue({ data: { id: 'c1', content: 'Updated' } })
    const result = await apiModule.commentsApi.update('c1', { content: 'Updated' }, 'author-u1')

    expect(axios.default.put).toHaveBeenCalledWith(
      '/comments/c1',
      { content: 'Updated' },
      { params: { author_uuid: 'author-u1' } },
    )
    expect(result.content).toBe('Updated')
  })

  it('delete calls DELETE /comments/{commentUuid} with author_uuid param', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.delete).mockResolvedValue({ data: { message: 'deleted' } })
    const result = await apiModule.commentsApi.delete('c1', 'author-u1')

    expect(axios.default.delete).toHaveBeenCalledWith('/comments/c1', {
      params: { author_uuid: 'author-u1' },
    })
    expect(result.message).toBe('deleted')
  })
})

describe('usersApi (additional)', () => {
  it('list calls GET /users/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ user_uuid: 'u1', first_name: 'John' }] })
    const result = await apiModule.usersApi.list()

    expect(axios.default.get).toHaveBeenCalledWith('/users/')
    expect(result).toHaveLength(1)
  })

  it('get calls GET /users/{uuid}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: { user_uuid: 'u1', first_name: 'John' } })
    const result = await apiModule.usersApi.get('u1')

    expect(axios.default.get).toHaveBeenCalledWith('/users/u1')
    expect(result.first_name).toBe('John')
  })

  it('create calls POST /users/', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { user_uuid: 'u1', first_name: 'Jane' } })
    const result = await apiModule.usersApi.create({ first_name: 'Jane' })

    expect(axios.default.post).toHaveBeenCalledWith('/users/', { first_name: 'Jane' })
    expect(result.first_name).toBe('Jane')
  })

  it('update calls PUT /users/{uuid}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.put).mockResolvedValue({ data: { user_uuid: 'u1', first_name: 'Updated' } })
    const result = await apiModule.usersApi.update('u1', { first_name: 'Updated' })

    expect(axios.default.put).toHaveBeenCalledWith('/users/u1', { first_name: 'Updated' })
    expect(result.first_name).toBe('Updated')
  })

  it('uploadPhoto calls POST /users/{uuid}/photo with FormData', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { url: 'photo.jpg' } })
    const file = new File([''], 'photo.jpg', { type: 'image/jpeg' })
    const result = await apiModule.usersApi.uploadPhoto('u1', file, 10, 20)

    expect(axios.default.post).toHaveBeenCalledWith('/users/u1/photo', expect.any(FormData))
    expect(result.url).toBe('photo.jpg')
  })

  it('deletePhoto calls DELETE /users/{uuid}/photo', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.delete).mockResolvedValue({ data: { message: 'deleted' } })
    const result = await apiModule.usersApi.deletePhoto('u1')

    expect(axios.default.delete).toHaveBeenCalledWith('/users/u1/photo')
    expect(result.message).toBe('deleted')
  })

  it('updatePhotoPosition calls PUT /users/{uuid}/photo-position', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.put).mockResolvedValue({ data: { message: 'updated' } })
    const result = await apiModule.usersApi.updatePhotoPosition('u1', 10, 20)

    expect(axios.default.put).toHaveBeenCalledWith('/users/u1/photo-position', { offset_x: 10, offset_y: 20 })
    expect(result.message).toBe('updated')
  })

  it('importCsv calls POST /users/import-csv with FormData', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { imported: 5 } })
    const file = new File(['a,b,c'], 'users.csv', { type: 'text/csv' })
    const result = await apiModule.usersApi.importCsv(file)

    expect(axios.default.post).toHaveBeenCalledWith('/users/import-csv', expect.any(FormData), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    expect(result.imported).toBe(5)
  })

  it('exportCsv calls GET /users/export-csv and creates download', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    const createObjectURL = vi.fn(() => 'blob:test')
    window.URL.createObjectURL = createObjectURL
    const clickFn = vi.fn()
    const removeFn = vi.fn()
    const setAttrFn = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockLink = { href: '', click: clickFn, remove: removeFn, setAttribute: setAttrFn } as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    document.createElement = vi.fn(() => mockLink) as any
    document.body.appendChild = vi.fn()
    window.URL.revokeObjectURL = vi.fn()

    vi.mocked(axios.default.get).mockResolvedValue({ data: new Blob(['a,b,c'], { type: 'text/csv' }) })
    await apiModule.usersApi.exportCsv()

    expect(axios.default.get).toHaveBeenCalledWith('/users/export-csv', {
      responseType: 'blob',
    })
    expect(createObjectURL).toHaveBeenCalled()
    expect(clickFn).toHaveBeenCalled()
  })
})

describe('attendanceApi (additional)', () => {
  it('getByUser calls GET /attendance/user/{uuid}', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ id: 1, status: 'present' }] })
    const result = await apiModule.attendanceApi.getByUser('user-u1')

    expect(axios.default.get).toHaveBeenCalledWith('/attendance/user/user-u1')
    expect(result).toHaveLength(1)
  })

  it('getByClass calls GET /attendance/class/{classId} with optional date', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ id: 1, status: 'present' }] })
    const result = await apiModule.attendanceApi.getByClass(5, '2026-01-01')

    expect(axios.default.get).toHaveBeenCalledWith('/attendance/class/5', { params: { date: '2026-01-01' } })
    expect(result).toHaveLength(1)
  })

  it('checkIn calls POST /attendance/check-in', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { id: 1, status: 'pending' } })
    const result = await apiModule.attendanceApi.checkIn('user-u1', 5, 10)

    expect(axios.default.post).toHaveBeenCalledWith('/attendance/check-in', {
      user_uuid: 'user-u1', class_id: 5, class_instance_id: 10,
    })
    expect(result.status).toBe('pending')
  })

  it('direct calls POST /attendance/direct', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { id: 1, status: 'present' } })
    const result = await apiModule.attendanceApi.direct('user-u1', 5, 10, 'teacher-u1')

    expect(axios.default.post).toHaveBeenCalledWith('/attendance/direct', {
      user_uuid: 'user-u1', class_id: 5, class_instance_id: 10, teacher_uuid: 'teacher-u1',
    })
    expect(result.status).toBe('present')
  })

  it('bulkConfirm calls POST /attendance/bulk-confirm with ids array', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { confirmed: [1, 2, 3] } })
    const result = await apiModule.attendanceApi.bulkConfirm([1, 2, 3])

    expect(axios.default.post).toHaveBeenCalledWith('/attendance/bulk-confirm', { ids: [1, 2, 3] })
    expect(result.confirmed).toHaveLength(3)
  })
})

describe('axios interceptor', () => {
  it('adds CSRF token for state-changing methods', async () => {
    localStorage.setItem('csrf_token', 'csrf-xyz')
    const axios = await import('axios')
    await import('@/lib/api')

    const handler = axios.default.interceptors.request.use.mock.calls[0][0]
    const config = { method: 'post', headers: {}, url: '/test' }
    const result = handler(config)
    expect(result.headers['X-CSRF-Token']).toBe('csrf-xyz')
  })

  it('does not add CSRF token for GET requests', async () => {
    localStorage.setItem('csrf_token', 'csrf-xyz')
    const axios = await import('axios')
    await import('@/lib/api')

    const handler = axios.default.interceptors.request.use.mock.calls[0][0]
    const config = { method: 'get', headers: {}, url: '/test' }
    const result = handler(config)
    expect(result.headers['X-CSRF-Token']).toBeUndefined()
  })

  it('sets Authorization header with kiosk token when available', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    apiModule.setKioskStaffToken('kiosk-token-1')
    const handler = axios.default.interceptors.request.use.mock.calls[0][0]
    const config = { method: 'get', headers: {}, url: '/test' }
    const result = handler(config)
    expect(result.headers['Authorization']).toBe('Bearer kiosk-token-1')
    apiModule.setKioskStaffToken(null)
  })

  it('does not set Authorization when no kiosk token', async () => {
    const axios = await import('axios')
    await import('@/lib/api')

    const handler = axios.default.interceptors.request.use.mock.calls[0][0]
    const config = { method: 'get', headers: {}, url: '/test' }
    const result = handler(config)
    expect(result.headers['Authorization']).toBeUndefined()
  })
})

describe('rolesApi (additional)', () => {
  it('getUserHistory calls GET /roles/user/{uuid}/history', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [{ role: 'admin', changed_at: '2026-01-01' }] })
    const result = await apiModule.rolesApi.getUserHistory('user-u1')

    expect(axios.default.get).toHaveBeenCalledWith('/roles/user/user-u1/history')
    expect(result).toHaveLength(1)
  })
})

describe('kioskApi (additional)', () => {
  it('verifyPin calls POST /kiosk/verify-pin', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({ data: { valid: true, user: { first_name: 'Test' } } })
    const result = await apiModule.kioskApi.verifyPin('1234')

    expect(axios.default.post).toHaveBeenCalledWith('/kiosk/verify-pin', { pin: '1234' })
    expect(result.valid).toBe(true)
  })

  it('verifyPinForUser calls POST /kiosk/verify-pin-for-user', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.post).mockResolvedValue({
      data: { valid: true, access_token: 'at', refresh_token: 'rt', csrf_token: 'ct' },
    })
    const result = await apiModule.kioskApi.verifyPinForUser('user-u1', '1234')

    expect(axios.default.post).toHaveBeenCalledWith('/kiosk/verify-pin-for-user', { user_uuid: 'user-u1', pin: '1234' })
    expect(result.valid).toBe(true)
  })

  it('updatePin calls PUT /kiosk/update-pin', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.put).mockResolvedValue({ data: { message: 'PIN updated' } })
    const result = await apiModule.kioskApi.updatePin('1234', '5678')

    expect(axios.default.put).toHaveBeenCalledWith('/kiosk/update-pin', { current_pin: '1234', new_pin: '5678' })
    expect(result.message).toBe('PIN updated')
  })
})

describe('commentsApi (additional branch)', () => {
  it('getFeed calls without role omits role param', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')

    vi.mocked(axios.default.get).mockResolvedValue({ data: [] })
    await apiModule.commentsApi.getFeed('user-u1')

    expect(axios.default.get).toHaveBeenCalledWith('/comments/feed', {
      params: { user_uuid: 'user-u1' },
    })
  })
})

describe('token management', () => {
  it('setKioskStaffToken persists in memory only', async () => {
    const apiModule = await import('@/lib/api')

    apiModule.setKioskStaffToken('token-1')
    expect(apiModule.getKioskStaffToken()).toBe('token-1')
    expect(sessionStorage.getItem('kiosk_staff_token')).toBeNull()

    apiModule.setKioskStaffToken(null)
    expect(apiModule.getKioskStaffToken()).toBeNull()
  })
})
