import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KioskLocked } from '@/app/kiosk/KioskLocked'

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

describe('KioskLocked', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders CKB brand text', () => {
    render(<KioskLocked />)
    expect(screen.getByText('CKB')).toBeInTheDocument()
  })

  it('renders Tracker text', () => {
    render(<KioskLocked />)
    expect(screen.getByText('Tracker')).toBeInTheDocument()
  })

  it('renders staff sign in button', () => {
    render(<KioskLocked />)
    expect(screen.getByText('Staff Sign In')).toBeInTheDocument()
  })

  it('renders staff login link', () => {
    render(<KioskLocked />)
    expect(screen.getByText('Staff Login — for admin and teacher access')).toBeInTheDocument()
  })

  it('renders find your name heading', () => {
    render(<KioskLocked />)
    expect(screen.getByText('Find Your Name')).toBeInTheDocument()
  })

  it('renders staff member sign in notice', () => {
    render(<KioskLocked />)
    expect(screen.getByText('A staff member must sign in first')).toBeInTheDocument()
  })
})
