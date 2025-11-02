import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { AnalyticsDataPoint } from '../../types/api.types'

interface CategoryBarChartProps {
  currentPeriodData: AnalyticsDataPoint[]
  previousPeriodData?: AnalyticsDataPoint[] | null
  currency: string
  visibleCategories?: string[]
}

export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({
  currentPeriodData,
  previousPeriodData,
  currency,
  visibleCategories = []
}) => {
  // Aggregate data by category
  const chartData = useMemo(() => {
    const categoryTotals = new Map<string, { current: number; previous: number }>()

    // Sum up current period amounts per category
    currentPeriodData.forEach((dataPoint) => {
      if (dataPoint.category_breakdowns) {
        dataPoint.category_breakdowns.forEach((breakdown) => {
          const current = categoryTotals.get(breakdown.category_name) || {
            current: 0,
            previous: 0
          }
          current.current += parseFloat(breakdown.amount)
          categoryTotals.set(breakdown.category_name, current)
        })
      }
    })

    // Sum up previous period amounts per category
    if (previousPeriodData) {
      previousPeriodData.forEach((dataPoint) => {
        if (dataPoint.category_breakdowns) {
          dataPoint.category_breakdowns.forEach((breakdown) => {
            const current = categoryTotals.get(breakdown.category_name) || {
              current: 0,
              previous: 0
            }
            current.previous += parseFloat(breakdown.amount)
            categoryTotals.set(breakdown.category_name, current)
          })
        }
      })
    }

    // Convert to array format for recharts
    const data = Array.from(categoryTotals.entries()).map(([name, values]) => ({
      category: name,
      current: values.current,
      previous: values.previous
    }))

    // Filter by visible categories if specified
    const filteredData =
      visibleCategories.length > 0
        ? data.filter((item) => visibleCategories.includes(item.category))
        : data

    // Sort by current amount (descending)
    return filteredData.sort((a, b) => b.current - a.current)
  }, [currentPeriodData, previousPeriodData, visibleCategories])

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
              {entry.name === 'current' ? 'Current Period' : 'Previous Period'}:{' '}
              {formatCurrency(entry.value)}
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
          <p className="text-lg font-medium">No category data available</p>
          <p className="text-sm mt-2">Try selecting different categories or adjusting your filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Comparison</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 12 }}
            stroke="#666"
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) =>
              value === 'current' ? 'Current Period' : 'Previous Period'
            }
          />
          <Bar
            dataKey="current"
            fill="#3B82F6"
            name="current"
            radius={[4, 4, 0, 0]}
          />
          {previousPeriodData && (
            <Bar
              dataKey="previous"
              fill="#9CA3AF"
              name="previous"
              radius={[4, 4, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
