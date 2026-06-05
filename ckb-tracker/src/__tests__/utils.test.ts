import { describe, it, expect, vi } from 'vitest'
import {
  cn,
  formatDate,
  formatTime,
  getInitials,
  getDaysAgo,
  debounce,
  DAYS_OF_WEEK,
} from '@/lib/utils'

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('handles undefined values', () => {
    expect(cn('a', undefined, 'b')).toBe('a b')
  })
})

describe('formatDate', () => {
  it('formats a date object', () => {
    const result = formatDate(new Date('2024-01-15'))
    expect(result).toContain('Jan')
    expect(result).toContain('15')
    expect(result).toContain('2024')
  })

  it('formats a date string', () => {
    const result = formatDate('2024-06-01')
    expect(result).toContain('Jun')
    expect(result).toContain('1')
    expect(result).toContain('2024')
  })
})

describe('formatTime', () => {
  it('formats 14:30 to 2:30 PM', () => {
    expect(formatTime('14:30')).toBe('2:30 PM')
  })

  it('formats 09:00 to 9:00 AM', () => {
    expect(formatTime('09:00')).toBe('9:00 AM')
  })

  it('handles midnight (00:00)', () => {
    expect(formatTime('00:00')).toBe('12:00 AM')
  })

  it('handles noon (12:00)', () => {
    expect(formatTime('12:00')).toBe('12:00 PM')
  })

  it('handles empty string', () => {
    expect(formatTime('')).toBe('')
  })
})

describe('getInitials', () => {
  it('returns JD for John Doe', () => {
    expect(getInitials('John', 'Doe')).toBe('JD')
  })

  it('handles lowercase input', () => {
    expect(getInitials('john', 'doe')).toBe('JD')
  })

  it('handles single character names', () => {
    expect(getInitials('A', 'B')).toBe('AB')
  })
})

describe('getDaysAgo', () => {
  it('returns null for null date', () => {
    expect(getDaysAgo(null)).toBeNull()
  })

  it('returns 0 for today', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(getDaysAgo(today)).toBe(0)
  })

  it('returns positive number for past date', () => {
    const result = getDaysAgo('2024-01-01')
    expect(result).toBeGreaterThan(0)
  })
})

describe('debounce', () => {
  it('delays execution', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 500)

    debounced()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)
    expect(fn).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('cancels previous call when invoked again', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 500)

    debounced()
    debounced()
    vi.advanceTimersByTime(500)
    expect(fn).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('passes arguments to the original function', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('arg1', 42)
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledWith('arg1', 42)

    vi.useRealTimers()
  })
})

describe('DAYS_OF_WEEK', () => {
  it('contains 7 days', () => {
    expect(DAYS_OF_WEEK).toHaveLength(7)
  })

  it('starts with Sunday', () => {
    expect(DAYS_OF_WEEK[0]).toBe('Sunday')
  })

  it('ends with Saturday', () => {
    expect(DAYS_OF_WEEK[6]).toBe('Saturday')
  })

  it('contains all days in order', () => {
    const expected = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    expect(DAYS_OF_WEEK).toEqual(expected)
  })
})
