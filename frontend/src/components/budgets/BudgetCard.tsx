import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { CircularProgress } from '../ui/circular-progress'
import { Budget, BudgetPerformance } from '../../types/api.types'
import { CurrencyAmountDisplay } from '../ui/currency-amount-display'
import { 
  PiggyBank, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Edit, 
  Trash2, 
  Calendar,
  Target
} from 'lucide-react'
import { format, isValid } from 'date-fns'

// Helper function to safely format dates
const safeFormatDate = (dateValue: string | Date | null | undefined, formatString: string = 'MMM dd, yyyy'): string => {
  if (!dateValue) return 'Invalid date'
  
  try {
    let date: Date
    if (typeof dateValue === 'string') {
      date = new Date(dateValue)
    } else {
      date = dateValue
    }
    
    if (!isValid(date)) {
      return 'Invalid date'
    }
    
    return format(date, formatString)
  } catch (error) {
    console.error('Date formatting error:', error, 'Date value:', dateValue)
    return 'Invalid date'
  }
}

// Helper function to check if budget is effectively active
const isEffectivelyActive = (budget: Budget): boolean => {
  // First check manual active status
  if (!budget.is_active) {
    return false
  }
  
  // Then check if budget is within its date range
  const today = new Date()
  const startDate = new Date(budget.startDate)
  const endDate = budget.endDate ? new Date(budget.endDate) : null
  
  // Check if today is before start date
  if (today < startDate) {
    return false
  }
  
  // Check if today is after end date (if end date exists)
  if (endDate && today > endDate) {
    return false
  }
  
  return true
}

interface BudgetCardProps {
  budget: Budget
  performance?: BudgetPerformance
  onEdit?: (budget: Budget) => void
  onDelete?: (budget: Budget) => void
  onLoadPerformance?: (budgetId: string) => void
  isLoading?: boolean
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'on_track':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    case 'over_budget':
      return <TrendingDown className="h-4 w-4 text-red-600" />
    default:
      return <PiggyBank className="h-4 w-4 text-gray-400" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'on_track':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'warning':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'over_budget':
      return 'text-red-600 bg-red-50 border-red-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'on_track':
      return 'On Track'
    case 'warning':
      return 'Warning'
    case 'over_budget':
      return 'Over Budget'
    default:
      return 'Unknown'
  }
}

const getPeriodText = (periodType: string, startDate: string, endDate?: string) => {
  switch (periodType) {
    case 'weekly':
      return `Weekly (${safeFormatDate(startDate, 'MMM dd')})`
    case 'monthly':
      return `Monthly (${safeFormatDate(startDate, 'MMM yyyy')})`
    case 'yearly':
      return `Yearly (${safeFormatDate(startDate, 'yyyy')})`
    case 'custom':
      return endDate 
        ? `${safeFormatDate(startDate, 'MMM dd')} - ${safeFormatDate(endDate, 'MMM dd')}`
        : `From ${safeFormatDate(startDate, 'MMM dd, yyyy')}`
    default:
      return 'Custom Period'
  }
}

export function BudgetCard({
  budget,
  performance,
  onEdit,
  onDelete,
  onLoadPerformance,
  isLoading = false
}: BudgetCardProps) {
  React.useEffect(() => {
    if (!performance && onLoadPerformance && budget.is_active) {
      onLoadPerformance(budget.id)
    }
  }, [budget.id, performance, onLoadPerformance, budget.is_active])

  const progressPercentage = (performance as any)?.percentage_used || performance?.percentageUsed || 0
  const status = performance?.status || 'unknown'
  const spent = performance?.spent || 0
  const remaining = performance?.remaining || budget.amount
  const effectivelyActive = isEffectivelyActive(budget)

  return (
    <Card className={`relative hover:shadow-md transition-shadow ${!effectivelyActive ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        {/* Header with Title and Actions */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <h3 className="font-medium text-sm truncate">{budget.name}</h3>
              {!effectivelyActive && (
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                  {!budget.is_active ? 'Inactive' : 'Expired'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              {getPeriodText(budget.periodType, budget.startDate, budget.endDate)}
            </div>
          </div>
          
          <div className="flex items-center gap-1 ml-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(budget)
                }}
                className="h-6 w-6"
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(budget)
                }}
                className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex items-center gap-4">
          {/* Left: Budget Amount */}
          <div className="flex-1">
            <div className="text-xs text-gray-500 mb-1">Budget</div>
            <CurrencyAmountDisplay
              amount={budget.amount}
              currency={budget.currency}
              className="font-semibold text-sm"
            />
            
            {performance && effectivelyActive && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-gray-500">Spent</div>
                  <CurrencyAmountDisplay
                    amount={spent}
                    currency={budget.currency}
                    className="font-medium text-red-600"
                  />
                </div>
                <div>
                  <div className="text-gray-500">Left</div>
                  <CurrencyAmountDisplay
                    amount={remaining}
                    currency={budget.currency}
                    className={`font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: Circular Progress */}
          <div className="flex flex-col items-center">
            {performance && effectivelyActive ? (
              <>
                <CircularProgress
                  percentage={progressPercentage}
                  size={50}
                  strokeWidth={4}
                  status={status}
                />
                <div className={`mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(status)}`}>
                  {getStatusText(status)}
                </div>
                {((performance as any).should_alert || performance.shouldAlert) && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                    <AlertTriangle className="h-3 w-3" />
                    Alert
                  </div>
                )}
              </>
            ) : budget.is_active && isLoading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent" />
                <span className="text-xs text-gray-500 mt-1">Loading</span>
              </div>
            ) : budget.is_active ? (
              <div className="flex flex-col items-center text-gray-400">
                <TrendingUp className="h-12 w-12 opacity-50" />
                <span className="text-xs">No data</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                <PiggyBank className="h-12 w-12 opacity-50" />
                <span className="text-xs">Inactive</span>
              </div>
            )}
          </div>
        </div>

        {/* Over Budget Alert */}
        {performance?.isOverBudget && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded p-2">
            <div className="flex items-center gap-2 text-red-700">
              <TrendingDown className="h-3 w-3" />
              <span className="text-xs font-medium">Over by</span>
              <CurrencyAmountDisplay
                amount={Math.abs(remaining)}
                currency={budget.currency}
                className="font-semibold text-xs"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}