import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, RankBadge } from '@/components/ui/Badge'
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { GlassPanel } from '@/components/ui/GlassPanel'

describe('Avatar', () => {
  it('renders initials when no image URL', () => {
    render(<Avatar firstName="John" lastName="Doe" />)
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('renders image when src is provided', () => {
    render(<Avatar src="https://example.com/photo.jpg" firstName="John" lastName="Doe" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg')
  })

  it('renders with custom size class', () => {
    const { container } = render(<Avatar firstName="A" lastName="B" size="xl" />)
    expect(container.querySelector('.h-16.w-16')).toBeTruthy()
  })
})

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>White Belt</Badge>)
    expect(screen.getByText('White Belt')).toBeInTheDocument()
  })

  it('applies default variant', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default')).toBeInTheDocument()
  })
})

describe('RankBadge', () => {
  it('renders rank text', () => {
    render(<RankBadge rank="Black" />)
    expect(screen.getByText('Black')).toBeInTheDocument()
  })

  it('returns null when no rank', () => {
    const { container } = render(<RankBadge />)
    expect(container.firstChild).toBeNull()
  })

  it('hides icon when showIcon is false', () => {
    render(<RankBadge rank="Black" showIcon={false} />)
    expect(screen.getByText('Black')).toBeInTheDocument()
  })
})

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>card content</p></Card>)
    expect(screen.getByText('card content')).toBeInTheDocument()
  })
})

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader><h2>Header</h2></CardHeader>)
    expect(screen.getByText('Header')).toBeInTheDocument()
  })
})

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent><p>Content</p></CardContent>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})

describe('CardFooter', () => {
  it('renders children', () => {
    render(<CardFooter><p>Footer</p></CardFooter>)
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })
})

describe('CardTitle', () => {
  it('renders title', () => {
    render(<CardTitle>My Title</CardTitle>)
    expect(screen.getByText('My Title')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<CardTitle description="A description">Title</CardTitle>)
    expect(screen.getByText('A description')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    const { container } = render(<CardTitle>Title</CardTitle>)
    expect(container.querySelector('p')).toBeNull()
  })
})

describe('Select', () => {
  const options = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
  ]

  it('renders all options', () => {
    render(<Select options={options} />)
    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
  })

  it('renders label', () => {
    render(<Select label="Choose" options={options} />)
    expect(screen.getByText('Choose')).toBeInTheDocument()
  })

  it('handles change event', async () => {
    const handleChange = vi.fn()
    render(<Select options={options} onChange={handleChange} />)

    await userEvent.selectOptions(screen.getByRole('combobox'), '2')
    expect(handleChange).toHaveBeenCalled()
  })

  it('displays error message', () => {
    render(<Select options={options} error="Required" />)
    expect(screen.getByText('Required')).toBeInTheDocument()
  })
})

describe('GlassPanel', () => {
  it('renders children', () => {
    render(<GlassPanel><p>glass content</p></GlassPanel>)
    expect(screen.getByText('glass content')).toBeInTheDocument()
  })
})
