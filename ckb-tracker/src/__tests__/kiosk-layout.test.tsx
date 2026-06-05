import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import KioskLayout from '@/app/kiosk/layout'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/lib/api', () => ({
  kioskApi: {
    unlock: vi.fn(),
    lock: vi.fn(),
  },
  setKioskStaffToken: vi.fn(),
}))

describe('KioskLayout', () => {
  it('renders kiosk header text', () => {
    render(<KioskLayout><div>content</div></KioskLayout>)
    expect(screen.getByText('Kiosk')).toBeInTheDocument()
  })

  it('renders CKB logo', () => {
    render(<KioskLayout><div>content</div></KioskLayout>)
    expect(screen.getByText('CKB')).toBeInTheDocument()
  })

  it('renders children', () => {
    render(<KioskLayout><div>child content</div></KioskLayout>)
    expect(screen.getByText('child content')).toBeInTheDocument()
  })
})
