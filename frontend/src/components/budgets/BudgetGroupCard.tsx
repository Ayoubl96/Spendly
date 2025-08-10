import React from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { CircularProgress } from '../ui/circular-progress'
import { CurrencyAmountDisplay } from '../ui/currency-amount-display'
import { BudgetGroup, BudgetSummary } from '../../types/api.types'
import { Badge, CalendarIcon, PencilIcon, TrashIcon } from 'lucide-react'

interface BudgetGroupCardProps {
  budgetGroup: BudgetGroup
  budgetSummary: BudgetSummary | null
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onClick?: () => void
}

const BudgetGroupCard: React.FC<BudgetGroupCardProps> = ({
  budgetGroup,
  budgetSummary,
  onView,
  onEdit,
  onDelete,
  onClick
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'on_track':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'over_budget':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'over_budget':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const isCurrentPeriod = () => {
    const today = new Date()
    const startDate = new Date(budgetGroup.startDate)
    const endDate = new Date(budgetGroup.endDate)
    return startDate <= today && today <= endDate
  }

  return (
    <Card 
      className={`py-12 px-5 hover:shadow-lg transition-shadow cursor-pointer relative ${
        isCurrentPeriod() ? 'ring-2 ring-blue-500 ring-opacity-20' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between absolute top-2 left-2 right-2">
        <div className="flex items-center gap-2">
          {isCurrentPeriod() && (
            <Card className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              Current Period
            </Card>
          )}
          {budgetSummary && (
            <Card className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(budgetSummary.overall_status)}`}>
              {budgetSummary.overall_status.replace('_', ' ').toUpperCase()}
            </Card>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <PencilIcon className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="text-red-600 hover:text-red-700"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {budgetGroup.name}
            </h3>
          </div>
          
          {budgetGroup.description && (
            <p className="text-sm text-gray-600 mb-2">
              {budgetGroup.description}
            </p>
          )}
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <CalendarIcon className="w-4 h-4" />
              {budgetGroup.periodType} - {formatDate(budgetGroup.startDate)} - {formatDate(budgetGroup.endDate)}
            </span>
          </div>
        </div>
      </div>

      {budgetSummary ? (
        <div className="space-y-4">
          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Total Budget</div>
              <div className="text-lg font-semibold">
                <CurrencyAmountDisplay
                  amount={budgetSummary.total_budget}
                  currency={budgetGroup.currency}
                />
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Spent</div>
              <div className={`text-lg font-semibold ${getStatusColor(budgetSummary.overall_status)}`}>
                <CurrencyAmountDisplay
                  amount={budgetSummary.total_spent}
                  currency={budgetGroup.currency}
                />
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Remaining</div>
              <div className="text-lg font-semibold">
                <CurrencyAmountDisplay
                  amount={budgetSummary.total_remaining}
                  currency={budgetGroup.currency}
                />
              </div>
            </div>
          </div>

          {/* Progress Circle */}
          <div className="flex justify-center">
            <CircularProgress
              percentage={budgetSummary.overall_percentage}
              size={80}
              strokeWidth={8}
              status={budgetSummary.overall_status}
            />
          </div>

          {/* Budget Count */}
          <div className="text-center text-sm text-gray-500">
            {budgetSummary.budget_count} {budgetSummary.budget_count === 1 ? 'budget' : 'budgets'}
          </div>

          {/* Category Breakdown Preview */}
          {Object.keys(budgetSummary.budgets).length > 0 && (
            <div className="pt-4 border-t">
              <div className="text-sm font-medium text-gray-700 mb-2">Categories</div>
              <div className="space-y-1">
                {Object.entries(budgetSummary.budgets).slice(0, 3).map(([budgetId, budget]) => (
                  <div key={budget.name} className="flex justify-between text-sm">
                    <span className="text-gray-600">{budget.name}</span>
                    <span className="font-medium">
                      <CurrencyAmountDisplay
                        amount={budget.spent}
                        currency={budgetGroup.currency}
                      />
                      {' / '}
                      <CurrencyAmountDisplay
                        amount={budget.amount}
                        currency={budgetGroup.currency}
                      />
                    </span>
                  </div>
                ))}
                {Object.keys(budgetSummary.budgets).length > 3 && (
                  <div className="text-xs text-gray-500 text-center pt-1">
                    +{Object.keys(budgetSummary.budgets).length - 3} more categories
                  </div>
                )}
              </div>
            </div>
          )}
        </div>        
      ) : (

        <div className="space-y-4">
          <div className="text-center text-gray-500">
            <div className="text-sm">Currency: {budgetGroup.currency}</div>
            <div className="text-xs mt-1">Click to view details</div>
          </div>
        </div>
      )}

      {onView && (
        <div className="mt-4 pt-4 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              onView()
            }}
          >
            View Details
          </Button>
        </div>
      )}
    </Card>
  )
}

export default BudgetGroupCard
