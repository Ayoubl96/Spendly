import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { BudgetCard } from './BudgetCard'
import { BudgetSummary, BudgetPerformance as BudgetPerformanceType } from '../../types/api.types'
import { CurrencyAmountDisplay } from '../ui/currency-amount-display'
import { 
  PiggyBank, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Target,
  DollarSign,
  Percent
} from 'lucide-react'
import { format, isValid } from 'date-fns'

interface BudgetPerformanceProps {
  budgetSummary?: BudgetSummary | null
  isLoading?: boolean
  className?: string
}

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

const getStatusIcon = (status: string, size: string = 'h-5 w-5') => {
  switch (status) {
    case 'on_track':
      return <CheckCircle className={`${size} text-green-600`} />
    case 'warning':
      return <AlertTriangle className={`${size} text-yellow-600`} />
    case 'over_budget':
      return <TrendingDown className={`${size} text-red-600`} />
    default:
      return <PiggyBank className={`${size} text-gray-400`} />
  }
}

const getStatusColor = (status: string) => {
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

export function BudgetPerformance({ 
  budgetSummary, 
  isLoading = false,
  className = ''
}: BudgetPerformanceProps) {
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Loading State */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: '100px' }} />
                </CardTitle>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 bg-gray-200 rounded animate-pulse" style={{ width: '60%' }} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!budgetSummary || budgetSummary.budget_count === 0) {
    return (
      <div className={`${className}`}>
        <Card>
          <CardContent className="text-center py-8">
            <PiggyBank className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Budget Data</h3>
            <p className="text-gray-500">
              Create your first budget to see performance metrics here.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const {
    total_budget,
    total_spent,
    total_remaining,
    overall_percentage,
    overall_status,
    budget_count,
    status_counts = {},
    budgets = []
  } = budgetSummary

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Budget */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyAmountDisplay amount={total_budget} currency="EUR" />
            </div>
            <p className="text-xs text-muted-foreground">
              Across {budget_count} {budget_count === 1 ? 'budget' : 'budgets'}
            </p>
          </CardContent>
        </Card>

        {/* Total Spent */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              <CurrencyAmountDisplay amount={total_spent} currency="EUR" />
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(overall_percentage)}% of total budget
            </p>
          </CardContent>
        </Card>

        {/* Remaining Budget */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${total_remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <CurrencyAmountDisplay amount={total_remaining} currency="EUR" />
            </div>
            <p className="text-xs text-muted-foreground">
              {total_remaining >= 0 ? 'Within budget' : 'Over budget'}
            </p>
          </CardContent>
        </Card>

        {/* Overall Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
            {getStatusIcon(overall_status, 'h-4 w-4')}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(overall_status)}`}>
              {getStatusText(overall_status)}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(overall_percentage)}% used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Budget Progress Overview
          </CardTitle>
          <CardDescription>
            Visual breakdown of your overall budget performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="font-medium">{Math.round(overall_percentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  overall_status === 'on_track' 
                    ? 'bg-green-500' 
                    : overall_status === 'warning' 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, overall_percentage))}%` }}
              />
            </div>
          </div>

          {/* Status Distribution */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">On Track</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {status_counts.on_track || 0}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Warning</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {status_counts.warning || 0}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Over Budget</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {status_counts.over_budget || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Details */}
      {budgets && budgets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget Details</CardTitle>
            <CardDescription>
              Individual budget performance breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {budgets.map((budget) => (
                <BudgetCard
                  key={budget.budgetId}
                  budget={{
                    id: budget.budgetId,
                    name: budget.name,
                    amount: budget.amount,
                    currency: budget.currency,
                    periodType: budget.periodType as 'weekly' | 'monthly' | 'yearly' | 'custom',
                    startDate: budget.startDate,
                    endDate: budget.endDate,
                    userId: '', // Not needed for display
                    categoryId: budget.category?.id || '',
                    subcategoryId: '', // Not available in performance data
                    alertThreshold: budget.alertThreshold,
                    is_active: true, // Assume active for display
                    createdAt: '',
                    updatedAt: ''
                  }}
                  performance={{
                    budgetId: budget.budgetId,
                    name: budget.name,
                    amount: budget.amount,
                    spent: budget.spent,
                    remaining: budget.remaining,
                    percentageUsed: budget.percentageUsed,
                    status: budget.status,
                    shouldAlert: budget.shouldAlert,
                    isOverBudget: budget.isOverBudget,
                    currency: budget.currency,
                    periodType: budget.periodType,
                    startDate: budget.startDate,
                    endDate: budget.endDate,
                    alertThreshold: budget.alertThreshold,
                    category: budget.category
                  }}
                  onEdit={undefined} // No edit functionality needed in performance view
                  onDelete={undefined} // No delete functionality needed in performance view
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}