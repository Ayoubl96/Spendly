import React from 'react'
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
import { AnalyticsDataPoint } from '../../types/api.types'

interface ExpenseLineChartProps {
  currentPeriodData: AnalyticsDataPoint[]
  previousPeriodData?: AnalyticsDataPoint[] | null
  groupBy: 'day' | 'week' | 'month'
  currency: string
}

export const ExpenseLineChart: React.FC<ExpenseLineChartProps> = ({
  currentPeriodData,
  previousPeriodData,
  groupBy,
  currency
}) => {
  // Prepare chart data
  const chartData = currentPeriodData.map((dataPoint, index) => {
    const item: any = {
      date: formatDate(dataPoint.date, groupBy),
      current: parseFloat(dataPoint.total_amount)
    }

    if (previousPeriodData && previousPeriodData[index]) {
      item.previous = parseFloat(previousPeriodData[index].total_amount)
    }

    return item
  })

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
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name === 'current' ? 'Current' : 'Previous'}: {formatCurrency(entry.value)}
            </p>
          ))}
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
            formatter={(value) => value === 'current' ? 'Current Period' : 'Previous Period'}
          />
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
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
