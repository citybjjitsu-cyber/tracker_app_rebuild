import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KioskLocked } from '@/app/kiosk/KioskLocked'
import { ThemeProvider } from '@/hooks/useTheme'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('@/lib/api', () => ({
  newsApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}))

beforeAll(() => {
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

describe('KioskLocked', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders CKB brand text', () => {
    render(<Wrapper><KioskLocked /></Wrapper>)
    expect(screen.getByText('CKB')).toBeInTheDocument()
  })

  it('renders Tracker text', () => {
    render(<Wrapper><KioskLocked /></Wrapper>)
    expect(screen.getByText('Tracker')).toBeInTheDocument()
  })

  it('renders kiosk sign in button', () => {
    render(<Wrapper><KioskLocked /></Wrapper>)
    expect(screen.getByText('Kiosk Sign In')).toBeInTheDocument()
  })

  it('renders staff login link', () => {
    render(<Wrapper><KioskLocked /></Wrapper>)
    expect(screen.getByText('User Login')).toBeInTheDocument()
  })

  it('renders find your name heading', () => {
    render(<Wrapper><KioskLocked /></Wrapper>)
    expect(screen.getByText('Find Your Name')).toBeInTheDocument()
  })

  it('renders staff member sign in notice', () => {
    render(<Wrapper><KioskLocked /></Wrapper>)
    expect(screen.getByText('A staff member must sign in first')).toBeInTheDocument()
  })
})
