import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KioskProvider, useKiosk } from '@/app/kiosk/KioskContext'
import { kioskApi } from '@/lib/api'
import type { User } from '@/types'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}))

vi.mock('@/lib/api', () => ({
  kioskApi: {
    unlock: vi.fn(),
    lock: vi.fn(),
  },
  setKioskStaffToken: vi.fn(),
  getKioskStaffToken: vi.fn(() => null),
  setOnKioskLock: vi.fn(),
}))

describe('KioskContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <KioskProvider>{children}</KioskProvider>
  }

  it('provides initial state', () => {
    function TestComponent() {
      const { isUnlocked, identifiedUser, selectedClassIds } = useKiosk()
      return (
        <div>
          <div data-testid="unlocked">{isUnlocked ? 'yes' : 'no'}</div>
          <div data-testid="identified">{identifiedUser ? 'yes' : 'no'}</div>
          <div data-testid="classes">{selectedClassIds.length}</div>
        </div>
      )
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    expect(screen.getByTestId('unlocked')).toHaveTextContent('no')
    expect(screen.getByTestId('identified')).toHaveTextContent('no')
    expect(screen.getByTestId('classes')).toHaveTextContent('0')
  })

  it('unlockKiosk sets isUnlocked and calls kioskApi.unlock', async () => {
    vi.mocked(kioskApi.unlock).mockResolvedValue({
      user: { first_name: 'John', last_name: 'Doe' },
      access_token: 'token-123',
    })

    function TestComponent() {
      const { isUnlocked, unlockedBy, unlockKiosk } = useKiosk()
      return (
        <div>
          <div data-testid="unlocked">{isUnlocked ? 'yes' : 'no'}</div>
          <div data-testid="unlocked-by">{unlockedBy || 'none'}</div>
          <button onClick={() => unlockKiosk('staff@test.com', 'pass123')}>Unlock</button>
        </div>
      )
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    await userEvent.click(screen.getByRole('button', { name: /unlock/i }))

    await waitFor(() => {
      expect(screen.getByTestId('unlocked')).toHaveTextContent('yes')
    })
    expect(screen.getByTestId('unlocked-by')).toHaveTextContent('John Doe')
    expect(vi.mocked(kioskApi.unlock)).toHaveBeenCalledWith('staff@test.com', 'pass123')
  })

  it('lockKiosk clears state and calls kioskApi.lock', async () => {
    vi.mocked(kioskApi.unlock).mockResolvedValue({
      user: { first_name: 'John', last_name: 'Doe' },
      access_token: 'token-123',
    })
    vi.mocked(kioskApi.lock).mockResolvedValue({})

    function TestComponent() {
      const { isUnlocked, unlockedBy, unlockKiosk, lockKiosk } = useKiosk()
      return (
        <div>
          <div data-testid="unlocked">{isUnlocked ? 'yes' : 'no'}</div>
          <div data-testid="unlocked-by">{unlockedBy || 'none'}</div>
          <button onClick={() => unlockKiosk('staff@test.com', 'pass')}>Unlock</button>
          <button onClick={lockKiosk}>Lock</button>
        </div>
      )
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    await userEvent.click(screen.getByRole('button', { name: /unlock/i }))
    await waitFor(() => {
      expect(screen.getByTestId('unlocked')).toHaveTextContent('yes')
    })

    await userEvent.click(screen.getByRole('button', { name: 'Lock' }))
    await waitFor(() => {
      expect(screen.getByTestId('unlocked')).toHaveTextContent('no')
    })
    expect(screen.getByTestId('unlocked-by')).toHaveTextContent('none')
    expect(vi.mocked(kioskApi.lock)).toHaveBeenCalled()
  })

  it('identifyUser sets identifiedUser', async () => {
    const testUser: User = {
      user_uuid: 'u1',
      first_name: 'Student',
      last_name: 'One',
      email: 'student@test.com',
      is_current: true,
      effective_date: '2024-01-01',
      created_date: '2024-01-01',
      updated_date: '2024-01-01',
    }

    function TestComponent() {
      const { identifiedUser, identifyUser } = useKiosk()
      return (
        <div>
          <div data-testid="identified">{identifiedUser ? identifiedUser.first_name : 'none'}</div>
          <button onClick={() => identifyUser(testUser)}>Identify</button>
        </div>
      )
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    await userEvent.click(screen.getByRole('button', { name: /identify/i }))

    await waitFor(() => {
      expect(screen.getByTestId('identified')).toHaveTextContent('Student')
    })
  })

  it('resetSession clears identifiedUser and selectedClassIds', async () => {
    const testUser: User = {
      user_uuid: 'u1',
      first_name: 'Student',
      last_name: 'One',
      email: 'student@test.com',
      is_current: true,
      effective_date: '2024-01-01',
      created_date: '2024-01-01',
      updated_date: '2024-01-01',
    }

    function TestComponent() {
      const { identifiedUser, selectedClassIds, identifyUser, toggleClass, resetSession } = useKiosk()
      return (
        <div>
          <div data-testid="identified">{identifiedUser ? 'yes' : 'no'}</div>
          <div data-testid="classes">{selectedClassIds.join(',') || 'none'}</div>
          <button onClick={() => identifyUser(testUser)}>Identify</button>
          <button onClick={() => toggleClass(1)}>Toggle Class 1</button>
          <button onClick={resetSession}>Reset</button>
        </div>
      )
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    await userEvent.click(screen.getByRole('button', { name: /identify/i }))
    await userEvent.click(screen.getByRole('button', { name: /toggle class 1/i }))

    await waitFor(() => {
      expect(screen.getByTestId('identified')).toHaveTextContent('yes')
    })
    expect(screen.getByTestId('classes')).toHaveTextContent('1')

    await userEvent.click(screen.getByRole('button', { name: /reset/i }))

    await waitFor(() => {
      expect(screen.getByTestId('identified')).toHaveTextContent('no')
      expect(screen.getByTestId('classes')).toHaveTextContent('none')
    })
  })

  it('toggleClass adds and removes class IDs from selection', async () => {
    function TestComponent() {
      const { selectedClassIds, toggleClass } = useKiosk()
      return (
        <div>
          <div data-testid="classes">{selectedClassIds.join(',') || 'none'}</div>
          <button onClick={() => toggleClass(1)}>Toggle 1</button>
          <button onClick={() => toggleClass(2)}>Toggle 2</button>
        </div>
      )
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    await userEvent.click(screen.getByRole('button', { name: /toggle 1/i }))
    await waitFor(() => {
      expect(screen.getByTestId('classes')).toHaveTextContent('1')
    })

    await userEvent.click(screen.getByRole('button', { name: /toggle 2/i }))
    await waitFor(() => {
      expect(screen.getByTestId('classes')).toHaveTextContent('1,2')
    })

    await userEvent.click(screen.getByRole('button', { name: /toggle 1/i }))
    await waitFor(() => {
      expect(screen.getByTestId('classes')).toHaveTextContent('2')
    })
  })

  it('clearClasses empties selectedClassIds', async () => {
    function TestComponent() {
      const { selectedClassIds, toggleClass, clearClasses } = useKiosk()
      return (
        <div>
          <div data-testid="classes">{selectedClassIds.join(',') || 'none'}</div>
          <button onClick={() => toggleClass(1)}>Toggle 1</button>
          <button onClick={() => toggleClass(2)}>Toggle 2</button>
          <button onClick={clearClasses}>Clear</button>
        </div>
      )
    }

    render(<Wrapper><TestComponent /></Wrapper>)

    await userEvent.click(screen.getByRole('button', { name: /toggle 1/i }))
    await userEvent.click(screen.getByRole('button', { name: /toggle 2/i }))
    await waitFor(() => {
      expect(screen.getByTestId('classes')).toHaveTextContent('1,2')
    })

    await userEvent.click(screen.getByRole('button', { name: /clear/i }))
    await waitFor(() => {
      expect(screen.getByTestId('classes')).toHaveTextContent('none')
    })
  })
})
