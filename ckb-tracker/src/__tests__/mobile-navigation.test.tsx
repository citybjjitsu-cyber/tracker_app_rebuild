import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MobileNavigation } from '@/components/layout/Sidebar'

const logout = vi.fn()

vi.mock('next/link', () => ({
  default: ({ children, href, onClick, ...props }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a href={href} onClick={onClick} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/check-in',
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { first_name: 'Test', last_name: 'User', email: 'test@example.com' },
    logout,
    roles: [{ name: 'Teacher' }],
  }),
}))

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}))

describe('MobileNavigation', () => {
  beforeEach(() => {
    logout.mockReset()
  })

  it('opens the role-aware menu from the labeled trigger', () => {
    render(<MobileNavigation />)

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))

    expect(screen.getByRole('complementary', { name: 'Mobile navigation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Check In' })).toHaveAttribute('href', '/check-in')
    expect(screen.getByRole('link', { name: 'Student Portal' })).toHaveAttribute('href', '/portal')
    expect(screen.getByRole('link', { name: 'Teacher' })).toHaveAttribute('href', '/teacher')
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
  })

  it('closes with Escape and the close button', () => {
    render(<MobileNavigation />)
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('complementary', { name: 'Mobile navigation' })).toHaveClass('-translate-x-full')

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close navigation menu' }))
    expect(screen.getByRole('complementary', { name: 'Mobile navigation' })).toHaveClass('-translate-x-full')
  })

  it('dismisses from the backdrop and keeps the trigger touch-safe', () => {
    const { container } = render(<MobileNavigation />)
    const trigger = screen.getByRole('button', { name: 'Open navigation menu' })

    expect(trigger).toHaveClass('min-h-11', 'min-w-11')
    expect(trigger).toHaveClass('top-[calc(1rem+env(safe-area-inset-top))]')

    fireEvent.click(trigger)
    const backdrop = container.querySelector('div[aria-hidden="true"]')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop!)

    expect(screen.getByRole('complementary', { name: 'Mobile navigation' })).toHaveClass('-translate-x-full')
  })

  it('closes after choosing a permitted destination', () => {
    render(<MobileNavigation />)
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    fireEvent.click(screen.getByRole('link', { name: 'Teacher' }))

    expect(screen.getByRole('complementary', { name: 'Mobile navigation' })).toHaveClass('-translate-x-full')
  })
})
