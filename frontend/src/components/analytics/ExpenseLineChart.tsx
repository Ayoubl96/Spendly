import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { AnalyticsDataPoint, CategoryBreakdown } from '../../types/api.types'

interface ExpenseLineChartProps {
  currentPeriodData: AnalyticsDataPoint[]
  previousPeriodData?: AnalyticsDataPoint[] | null
  groupBy: 'day' | 'week' | 'month'
  currency: string
  selectedCategoryIds?: string[]
  showByCategory?: boolean
}

// Color palette for categories
const CATEGORY_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16', // Lime
]

export const ExpenseLineChart: React.FC<ExpenseLineChartProps> = ({
  currentPeriodData,
  previousPeriodData,
  groupBy,
  currency,
  selectedCategoryIds = [],
  showByCategory = true
}) => {
  // Prepare chart data with category breakdowns
  const chartData = useMemo(() => {
    return currentPeriodData.map((dataPoint, index) => {
      const item: any = {
        date: formatDate(dataPoint.date, groupBy),
        current: parseFloat(dataPoint.total_amount)
      }

      // Add previous period total if available
      if (previousPeriodData && previousPeriodData[index]) {
        item.previous = parseFloat(previousPeriodData[index].total_amount)
      }

      // Add category breakdowns if showing by category
      if (showByCategory && dataPoint.category_breakdowns) {
        dataPoint.category_breakdowns.forEach((breakdown: CategoryBreakdown) => {
          // Use category name as the key for the chart data
          item[breakdown.category_name] = parseFloat(breakdown.amount)
        })
      }

      return item
    })
  }, [currentPeriodData, previousPeriodData, groupBy, showByCategory])

  // Get unique categories from the data
  const categories = useMemo(() => {
    const categorySet = new Set<string>()
    currentPeriodData.forEach((dataPoint) => {
      if (dataPoint.category_breakdowns) {
        dataPoint.category_breakdowns.forEach((breakdown: CategoryBreakdown) => {
          categorySet.add(breakdown.category_name)
        })
      }
    })
    return Array.from(categorySet)
  }, [currentPeriodData])

  function formatDate(dateStr: string, grouping: string): string {
    const date = new Date(dateStr)

    if (grouping === 'day') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else if (grouping === 'week') {
      return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            // Format the label for display
            let displayName = entry.name
            if (entry.name === 'current') {
              displayName = showByCategory ? 'Total (Current)' : 'Current Period'
            } else if (entry.name === 'previous') {
              displayName = 'Previous Period'
            }

            return (
              <p key={index} style={{ color: entry.color }} className="text-sm">
                {displayName}: {formatCurrency(entry.value)}
              </p>
            )
          })}
        </div>
      )
    }
    return null
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 border border-gray-200">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No data available</p>
          <p className="text-sm mt-2">Try adjusting your filters or date range</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Trends</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => {
              if (value === 'current') {
                return showByCategory ? 'Total (Current)' : 'Current Period'
              }
              if (value === 'previous') {
                return 'Previous Period'
              }
              return value // Category names
            }}
          />

          {/* Show category lines if enabled and categories exist */}
          {showByCategory && categories.length > 0 ? (
            <>
              {/* Render a line for each category */}
              {categories.map((categoryName, index) => (
                <Line
                  key={categoryName}
                  type="monotone"
                  dataKey={categoryName}
                  stroke={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name={categoryName}
                />
              ))}
              {/* Total line (dashed for distinction) */}
              <Line
                type="monotone"
                dataKey="current"
                stroke="#1F2937"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name="current"
              />
            </>
          ) : (
            /* Show only total lines when not showing by category */
            <>
              <Line
                type="monotone"
                dataKey="current"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="current"
              />
              {previousPeriodData && (
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke="#9CA3AF"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="previous"
                />
              )}
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
