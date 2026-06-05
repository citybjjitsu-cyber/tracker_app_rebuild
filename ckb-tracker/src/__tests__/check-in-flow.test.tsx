import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('shows loader when isLoading', () => {
    render(<Button isLoading>Loading</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
  })

  it('applies variant classes', () => {
    const { rerender } = render(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button variant="destructive">Danger</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('fires onClick when clicked', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Press</Button>)

    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire onClick when disabled', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick} disabled>Press</Button>)

    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })
})

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('displays error message', () => {
    render(<Input label="Email" error="Required field" />)
    expect(screen.getByText('Required field')).toBeInTheDocument()
  })

  it('displays hint when no error', () => {
    render(<Input label="Email" hint="Enter your email" />)
    expect(screen.getByText('Enter your email')).toBeInTheDocument()
  })

  it('does not show hint when error is present', () => {
    render(<Input label="Email" error="Invalid email" hint="Enter your email" />)
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
    expect(screen.queryByText('Enter your email')).not.toBeInTheDocument()
  })

  it('accepts user input', async () => {
    render(<Input label="Name" />)
    const input = screen.getByLabelText('Name')
    await userEvent.type(input, 'John')
    expect(input).toHaveValue('John')
  })
})
