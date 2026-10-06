import { beforeEach, describe, expect, it, vi } from 'vitest'

const secureValues = new Map<string, string>()

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}))

vi.mock('@aparajita/capacitor-secure-storage', () => ({
  KeychainAccess: { whenPasscodeSetThisDeviceOnly: 'whenPasscodeSetThisDeviceOnly' },
  SecureStorage: {
    setDefaultKeychainAccess: vi.fn(),
    set: vi.fn(async (key: string, value: string) => secureValues.set(key, value)),
    getItem: vi.fn(async (key: string) => secureValues.get(key) ?? null),
    remove: vi.fn(async (key: string) => secureValues.delete(key)),
  },
}))

vi.mock('axios', () => {
  const mockAxios = vi.fn()
  mockAxios.create = vi.fn(() => mockAxios)
  mockAxios.get = vi.fn()
  mockAxios.post = vi.fn()
  mockAxios.put = vi.fn()
  mockAxios.delete = vi.fn()
  mockAxios.interceptors = {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  }
  mockAxios.defaults = {}
  return { default: mockAxios }
})

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  secureValues.clear()
})

describe('native session storage', () => {
  it('round-trips and clears native tokens', async () => {
    const storage = await import('@/lib/nativeSessionStorage')

    await storage.saveNativeSession({ accessToken: 'access-1', refreshToken: 'refresh-1' })
    expect(await storage.loadNativeSession()).toEqual({ accessToken: 'access-1', refreshToken: 'refresh-1' })
    expect(storage.getNativeAccessToken()).toBe('access-1')

    await storage.clearNativeSession()
    expect(await storage.loadNativeSession()).toBeNull()
    expect(storage.getNativeAccessToken()).toBeNull()
  })
})

describe('native auth API contract', () => {
  it('marks login as a Capacitor request', async () => {
    const axios = await import('axios')
    const apiModule = await import('@/lib/api')
    vi.mocked(axios.default.post).mockResolvedValue({ data: { access_token: 'a', refresh_token: 'r' } })

    await apiModule.authApi.login('staff@test.com', 'password123')

    expect(axios.default.post).toHaveBeenCalledWith(
      '/auth/login',
      { email: 'staff@test.com', password: 'password123' },
      { headers: { 'X-Client-Platform': 'capacitor' } },
    )
  })
})
