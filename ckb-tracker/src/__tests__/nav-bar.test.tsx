import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import NavBar from '@/components/NavBar'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe('NavBar', () => {
  it('renders CKB Tracker title', () => {
    render(<NavBar />)
    expect(screen.getByText('CKB Tracker')).toBeInTheDocument()
  })

  it('renders all navigation links', () => {
    render(<NavBar />)
    expect(screen.getByText('Check In')).toBeInTheDocument()
    expect(screen.getByText('Student Portal')).toBeInTheDocument()
    expect(screen.getByText('Teacher')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('renders theme toggle button', () => {
    render(<NavBar />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })
})
