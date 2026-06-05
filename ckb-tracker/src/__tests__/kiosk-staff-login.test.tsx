import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KioskStaffLogin } from '@/app/kiosk/KioskStaffLogin'

const mockUnlockKiosk = vi.fn()
const mockOnCancel = vi.fn()

vi.mock('@/app/kiosk/KioskContext', () => ({
  useKiosk: () => ({
    unlockKiosk: mockUnlockKiosk,
    setError: vi.fn(),
  }),
}))

describe('KioskStaffLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(<KioskStaffLogin onCancel={mockOnCancel} />)

    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /unlock kiosk/i })).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('calls unlockKiosk on successful submit', async () => {
    mockUnlockKiosk.mockResolvedValue(undefined)

    render(<KioskStaffLogin onCancel={mockOnCancel} />)

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'staff@test.com')
    await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /unlock kiosk/i }))

    await waitFor(() => {
      expect(mockUnlockKiosk).toHaveBeenCalledWith('staff@test.com', 'password123')
    })
  })

  it('displays error message on failed unlock', async () => {
    mockUnlockKiosk.mockRejectedValue(new Error('Invalid credentials'))

    render(<KioskStaffLogin onCancel={mockOnCancel} />)

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'staff@test.com')
    await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /unlock kiosk/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('calls onCancel when Cancel is clicked', async () => {
    render(<KioskStaffLogin onCancel={mockOnCancel} />)

    await userEvent.click(screen.getByText('Cancel'))

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('shows loading state while submitting', async () => {
    mockUnlockKiosk.mockImplementation(() => new Promise(() => {}))

    render(<KioskStaffLogin onCancel={mockOnCancel} />)

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'staff@test.com')
    await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'pass')

    await userEvent.click(screen.getByRole('button', { name: /unlock kiosk/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /unlocking/i })).toBeInTheDocument()
    })
  })
})
