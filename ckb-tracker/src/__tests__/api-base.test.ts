import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('api base configuration', () => {
  it('uses relative paths when the production proxy is enabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com')
    vi.stubEnv('NEXT_PUBLIC_API_PROXY', 'true')

    const { API_BASE_URL, apiUrl } = await import('@/lib/apiBase')

    expect(API_BASE_URL).toBe('')
    expect(apiUrl('/auth/me')).toBe('/auth/me')
  })

  it('uses the configured API origin when proxying is disabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com/')
    vi.stubEnv('NEXT_PUBLIC_API_PROXY', 'false')

    const { API_BASE_URL, apiUrl } = await import('@/lib/apiBase')

    expect(API_BASE_URL).toBe('https://api.example.com')
    expect(apiUrl('/auth/me')).toBe('https://api.example.com/auth/me')
  })
})
