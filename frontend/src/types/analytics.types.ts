export type GroupByType = 'day' | 'week' | 'month'

export interface CategoryBreakdown {
  category_id: string
  category_name: string
  amount: string
  currency: string
}

export interface AnalyticsDataPoint {
  date: string
  total_amount: string
  currency: string
  category_breakdowns: CategoryBreakdown[]
}

export interface AnalyticsSummary {
  total_current: string
  total_previous: string | null
  change_percentage: string | null
  average_per_period: string
  currency: string
  period_count: number
}

export interface AnalyticsRequest {
  start_date: string
  end_date: string
  category_ids?: string[]
  group_by: GroupByType
  include_previous_period: boolean
}

export interface AnalyticsResponse {
  current_period: AnalyticsDataPoint[]
  previous_period: AnalyticsDataPoint[] | null
  summary: AnalyticsSummary
  request_params: AnalyticsRequest
}

export type TimeRangePreset =
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_month'
  | 'this_year'
  | 'last_year'
  | 'custom'

export interface TimeRange {
  preset: TimeRangePreset
  start_date: Date
  end_date: Date
}
