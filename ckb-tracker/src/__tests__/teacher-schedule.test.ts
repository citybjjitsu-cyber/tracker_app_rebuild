import { describe, expect, it, vi } from 'vitest'
import { getWeekDates, normalizeDay, toDateString, WEEK_DAYS } from '@/lib/teacherSchedule'

describe('teacher schedule helpers', () => {
  it('normalizes supported day abbreviations and whitespace', () => {
    expect(normalizeDay(' mon ')).toBe('Monday')
    expect(normalizeDay('THURS')).toBe('Thursday')
    expect(normalizeDay('Sunday')).toBe('Sunday')
  })

  it('returns undefined for missing or unknown days', () => {
    expect(normalizeDay()).toBeUndefined()
    expect(normalizeDay('weekday')).toBeUndefined()
  })

  it('keeps the teacher week ordered from Monday through Sunday', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 30, 12, 0, 0))

    const dates = getWeekDates(0)

    expect(dates).toHaveLength(7)
    expect(dates[0].getDay()).toBe(1)
    expect(dates.map((date) => date.getDay())).toEqual([1, 2, 3, 4, 5, 6, 0])
    expect(dates.map(toDateString)).toHaveLength(7)

    vi.useRealTimers()
  })

  it('moves the schedule exactly one week for an offset', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 30, 12, 0, 0))

    const currentWeek = getWeekDates(0)
    const nextWeek = getWeekDates(1)

    expect(nextWeek[0].getTime() - currentWeek[0].getTime()).toBe(7 * 24 * 60 * 60 * 1000)
    expect(WEEK_DAYS).toHaveLength(7)

    vi.useRealTimers()
  })
})
