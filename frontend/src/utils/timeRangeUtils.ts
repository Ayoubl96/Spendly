import { TimeRange, TimeRangePreset } from '../types/analytics.types'

export function getTimeRange(preset: TimeRangePreset, customStart?: Date, customEnd?: Date): TimeRange {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()

  switch (preset) {
    case 'last_7_days':
      return {
        preset,
        start_date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        end_date: today
      }

    case 'last_30_days':
      return {
        preset,
        start_date: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        end_date: today
      }

    case 'last_90_days':
      return {
        preset,
        start_date: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
        end_date: today
      }

    case 'this_month':
      return {
        preset,
        start_date: new Date(currentYear, currentMonth, 1),
        end_date: new Date(currentYear, currentMonth + 1, 0)
      }

    case 'this_year':
      return {
        preset,
        start_date: new Date(currentYear, 0, 1),
        end_date: new Date(currentYear, 11, 31)
      }

    case 'last_year':
      return {
        preset,
        start_date: new Date(currentYear - 1, 0, 1),
        end_date: new Date(currentYear - 1, 11, 31)
      }

    case 'custom':
      return {
        preset,
        start_date: customStart || today,
        end_date: customEnd || today
      }

    default:
      // Default to this year
      return {
        preset: 'this_year',
        start_date: new Date(currentYear, 0, 1),
        end_date: new Date(currentYear, 11, 31)
      }
  }
}

export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0]
}
