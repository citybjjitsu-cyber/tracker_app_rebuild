import { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { ThemeProvider, useTheme } from '@/hooks/useTheme'

const mockRouterPush = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, refresh: vi.fn() }),
}))

describe('useAuth', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    localStorage.clear()
  })

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>
  }

  it('provides default unauthenticated state', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

    function TestComponent() {
      const { isAuthenticated, isLoading } = useAuth()
      if (isLoading) return <div>loading...</div>
      return <div>{isAuthenticated ? 'authenticated' : 'not authenticated'}</div>
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    await waitFor(() => {
      expect(screen.getByText('not authenticated')).toBeInTheDocument()
    })
  })

  it('login sets user and isAuthenticated', async () => {
    const mockUser = {
      user_uuid: 'u1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@test.com',
    }

    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: mockUser,
          roles: [{ id: 1, name: 'Admin' }],
          csrf_token: 'csrf-123',
        }),
      } as Response)

    function TestComponent() {
      const { isAuthenticated, user, login, isLoading } = useAuth()
      if (isLoading) return <div>loading...</div>
      return (
        <div>
          <button onClick={() => login('john@test.com', 'pass')}>Login</button>
          <div data-testid="auth-status">
            {isAuthenticated ? `Hello ${user?.first_name}` : 'not authenticated'}
          </div>
        </div>
      )
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('not authenticated')
    })

    await userEvent.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Hello John')
    })
  })

  it('login throws error when response is not ok', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Invalid credentials' }),
      } as Response)

    function TestComponent() {
      const { isAuthenticated, login, isLoading } = useAuth()
      const [error, setError] = useState('')
      if (isLoading) return <div>loading...</div>
      return (
        <div>
          <button onClick={async () => {
            try {
              await login('bad@test.com', 'wrong')
            } catch (e: unknown) {
              setError((e as Error).message)
            }
          }}>Login</button>
          <div data-testid="status">
            {isAuthenticated ? 'authenticated' : 'not authenticated'}
          </div>
          {error && <div data-testid="error">{error}</div>}
        </div>
      )
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('not authenticated')
    })

    await userEvent.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials')
    })
  })

  it('refreshSession on mount with /auth/me success sets user and roles', async () => {
    const mockUser = {
      user_uuid: 'u1',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@test.com',
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: mockUser,
        roles: [{ id: 1, name: 'Admin' }],
        csrf_token: 'csrf-123',
      }),
    } as Response)

    function TestComponent() {
      const { isAuthenticated, isLoading, user, roles } = useAuth()
      if (isLoading) return <div>loading...</div>
      return (
        <div>
          <div data-testid="status">
            {isAuthenticated ? `Hello ${user?.first_name}` : 'not authenticated'}
          </div>
          <div data-testid="roles">{roles.length > 0 ? roles[0].name : 'none'}</div>
        </div>
      )
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Hello Jane')
    })
    expect(screen.getByTestId('roles')).toHaveTextContent('Admin')
  })

  it('refreshSession retries with /auth/refresh on 401', async () => {
    const mockUser = {
      user_uuid: 'u2',
      first_name: 'Bob',
      last_name: 'Smith',
      email: 'bob@test.com',
    }

    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: false, status: 401 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: mockUser,
          roles: [{ id: 2, name: 'Teacher' }],
          csrf_token: 'csrf-456',
        }),
      } as Response)

    function TestComponent() {
      const { isAuthenticated, isLoading, user, roles } = useAuth()
      if (isLoading) return <div>loading...</div>
      return (
        <div>
          <div data-testid="status">
            {isAuthenticated ? `Hello ${user?.first_name}` : 'not authenticated'}
          </div>
          <div data-testid="roles">{roles.length > 0 ? roles[0].name : 'none'}</div>
        </div>
      )
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Hello Bob')
    })
    expect(screen.getByTestId('roles')).toHaveTextContent('Teacher')
  })

  it('refreshSession complete failure sets user to null', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: false, status: 401 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 401 } as Response)

    function TestComponent() {
      const { isAuthenticated, isLoading } = useAuth()
      if (isLoading) return <div>loading...</div>
      return <div data-testid="status">{isAuthenticated ? 'authenticated' : 'not authenticated'}</div>
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('not authenticated')
    })
  })

  it('logout clears user state', async () => {
    const mockUser = {
      user_uuid: 'u1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@test.com',
    }

    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: mockUser,
          roles: [{ id: 1, name: 'Admin' }],
          csrf_token: 'csrf-123',
        }),
      } as Response)
      .mockResolvedValueOnce({ ok: true } as Response)

    function TestComponent() {
      const { isAuthenticated, user, login, logout, isLoading } = useAuth()
      if (isLoading) return <div>loading...</div>
      return (
        <div>
          <button onClick={() => login('john@test.com', 'pass')}>Login</button>
          <button onClick={logout}>Logout</button>
          <div data-testid="status">
            {isAuthenticated ? `Hello ${user?.first_name}` : 'not authenticated'}
          </div>
        </div>
      )
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('not authenticated')
    })

    await userEvent.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Hello John')
    })

    await userEvent.click(screen.getByRole('button', { name: /logout/i }))

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('not authenticated')
    })
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/')
    })
  })

  it('logoutAll clears user state', async () => {
    const mockUser = {
      user_uuid: 'u1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@test.com',
    }

    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: mockUser,
          roles: [{ id: 1, name: 'Admin' }],
          csrf_token: 'csrf-123',
        }),
      } as Response)
      .mockResolvedValueOnce({ ok: true } as Response)

    function TestComponent() {
      const { isAuthenticated, user, login, logoutAll, isLoading } = useAuth()
      if (isLoading) return <div>loading...</div>
      return (
        <div>
          <button onClick={() => login('john@test.com', 'pass')}>Login</button>
          <button onClick={logoutAll}>Logout All</button>
          <div data-testid="status">
            {isAuthenticated ? `Hello ${user?.first_name}` : 'not authenticated'}
          </div>
        </div>
      )
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('not authenticated')
    })

    await userEvent.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Hello John')
    })

    await userEvent.click(screen.getByRole('button', { name: /logout all/i }))

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('not authenticated')
    })
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/')
    })
  })
})

describe('useTheme', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('No theme')))
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    localStorage.clear()
  })

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <ThemeProvider>{children}</ThemeProvider>
  }

  it('provides default theme value', async () => {
    function TestComponent() {
      const { theme } = useTheme()
      return <div>current theme: {theme}</div>
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    await waitFor(() => {
      expect(screen.getByText(/current theme:/)).toBeInTheDocument()
    })
  })

  it('renders inside ThemeProvider without error', async () => {
    function TestComponent() {
      const { theme } = useTheme()
      return <div>theme: {theme}</div>
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    await waitFor(() => {
      expect(screen.getByText(/theme:/)).toBeInTheDocument()
    })
  })

  it('toggleTheme switches from light to dark', async () => {
    function TestComponent() {
      const { theme, toggleTheme } = useTheme()
      return (
        <div>
          <div data-testid="theme">{theme}</div>
          <button onClick={toggleTheme}>Toggle</button>
        </div>
      )
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    expect(screen.getByTestId('theme')).toHaveTextContent('light')

    await userEvent.click(screen.getByRole('button', { name: /toggle/i }))

    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })

  it('resetToDefault clears active theme', async () => {
    const themeConfig = {
      '--background': '#fff',
      '--foreground': '#000',
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        name: 'custom',
        config: themeConfig,
      }),
    } as Response)

    function TestComponent() {
      const { activeThemeName, resetToDefault } = useTheme()
      return (
        <div>
          <div data-testid="theme-name">{activeThemeName || 'none'}</div>
          <button onClick={resetToDefault}>Reset</button>
        </div>
      )
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    await waitFor(() => {
      expect(screen.getByTestId('theme-name')).toHaveTextContent('custom')
    })

    await userEvent.click(screen.getByRole('button', { name: /reset/i }))

    expect(screen.getByTestId('theme-name')).toHaveTextContent('none')
  })

  it('initial theme from localStorage', async () => {
    localStorage.setItem('theme', 'dark')

    function TestComponent() {
      const { theme } = useTheme()
      return <div data-testid="theme">{theme}</div>
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })

  it('active theme from API sets activeThemeName and activeTheme', async () => {
    const themeConfig = {
      '--background': '#fff',
      '--foreground': '#000',
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        name: 'custom',
        config: themeConfig,
      }),
    } as Response)

    function TestComponent() {
      const { activeThemeName, activeTheme } = useTheme()
      return (
        <div>
          <div data-testid="theme-name">{activeThemeName || 'none'}</div>
          <div data-testid="theme-config">{activeTheme ? 'loaded' : 'none'}</div>
        </div>
      )
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    await waitFor(() => {
      expect(screen.getByTestId('theme-name')).toHaveTextContent('custom')
    })
    expect(screen.getByTestId('theme-config')).toHaveTextContent('loaded')
  })
})
