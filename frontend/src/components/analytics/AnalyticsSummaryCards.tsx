import React from 'react'
import { AnalyticsSummary } from '../../types/api.types'

interface AnalyticsSummaryCardsProps {
  summary: AnalyticsSummary
}

export const AnalyticsSummaryCards: React.FC<AnalyticsSummaryCardsProps> = ({ summary }) => {
  const formatCurrency = (amount: string, currency: string) => {
    const num = parseFloat(amount)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(num)
  }

  const getChangeIcon = (changePercentage: string | null) => {
    if (!changePercentage) return null
    const change = parseFloat(changePercentage)
    if (change > 0) return '📈'
    if (change < 0) return '📉'
    return '➡️'
  }

  const getChangeColor = (changePercentage: string | null) => {
    if (!changePercentage) return 'text-gray-600'
    const change = parseFloat(changePercentage)
    if (change > 0) return 'text-red-600'
    if (change < 0) return 'text-green-600'
    return 'text-gray-600'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Current Period Total */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="text-sm font-medium text-gray-600 mb-1">Current Period</div>
        <div className="text-2xl font-bold text-gray-900">
          {formatCurrency(summary.total_current, summary.currency)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Total expenses
        </div>
      </div>

      {/* Average per Period */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="text-sm font-medium text-gray-600 mb-1">Average per Period</div>
        <div className="text-2xl font-bold text-gray-900">
          {formatCurrency(summary.average_per_period, summary.currency)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {summary.period_count} periods
        </div>
      </div>

      {/* Previous Period (if available) */}
      {summary.total_previous && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-1">Previous Period</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(summary.total_previous, summary.currency)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Comparison baseline
          </div>
        </div>
      )}

      {/* Change Percentage (if available) */}
      {summary.change_percentage && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-1">Change</div>
          <div className={`text-2xl font-bold flex items-center ${getChangeColor(summary.change_percentage)}`}>
            <span className="mr-2">{getChangeIcon(summary.change_percentage)}</span>
            {parseFloat(summary.change_percentage).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            vs previous period
          </div>
        </div>
      )}
    </div>
  )
}
