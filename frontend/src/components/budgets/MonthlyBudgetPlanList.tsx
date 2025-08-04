import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { MonthlyBudgetPlanSummary } from '../../types/budget-plan.types'
import { CurrencyAmountDisplay } from '../ui/currency-amount-display'
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Edit, 
  Trash2,
  Copy,
  BarChart3
} from 'lucide-react'

interface MonthlyBudgetPlanListProps {
  plans: MonthlyBudgetPlanSummary[]
  onEditPlan?: (plan: MonthlyBudgetPlanSummary) => void
  onDeletePlan?: (plan: MonthlyBudgetPlanSummary) => void
  onDuplicatePlan?: (plan: MonthlyBudgetPlanSummary) => void
  onViewDetails?: (plan: MonthlyBudgetPlanSummary) => void
  isLoading?: boolean
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const getStatusColor = (status: 'on_track' | 'warning' | 'over_budget') => {
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

const getStatusIcon = (status: 'on_track' | 'warning' | 'over_budget', className?: string) => {
  switch (status) {
    case 'on_track':
      return <CheckCircle className={`text-green-600 ${className || 'h-4 w-4'}`} />
    case 'warning':
      return <AlertTriangle className={`text-yellow-600 ${className || 'h-4 w-4'}`} />
    case 'over_budget':
      return <TrendingDown className={`text-red-600 ${className || 'h-4 w-4'}`} />
    default:
      return <CheckCircle className={`text-gray-600 ${className || 'h-4 w-4'}`} />
  }
}

const getStatusText = (status: 'on_track' | 'warning' | 'over_budget') => {
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

export function MonthlyBudgetPlanList({
  plans,
  onEditPlan,
  onDeletePlan,
  onDuplicatePlan,
  onViewDetails,
  isLoading = false
}: MonthlyBudgetPlanListProps) {
  
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <Card className="text-center p-12">
        <CardContent>
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <CardTitle className="text-gray-600 mb-2">No Monthly Budget Plans</CardTitle>
          <CardDescription className="text-gray-500 mb-4">
            Create your first monthly budget plan to get started with organized budget management.
          </CardDescription>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {plans.map(plan => {
        const monthName = MONTH_NAMES[plan.month] || 'Unknown'
        const progressPercentage = Math.min(100, Math.max(0, plan.overall_percentage))
        
        return (
          <Card key={plan.plan_id} className="relative hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    {monthName} {plan.year}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {plan.category_count} categories • {plan.active_budget_count} active budgets
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-1">
                  {onViewDetails && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onViewDetails(plan)}
                      title="View Details"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {onEditPlan && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEditPlan(plan)}
                      title="Edit Plan"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {onDuplicatePlan && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onDuplicatePlan(plan)}
                      title="Duplicate Plan"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {onDeletePlan && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onDeletePlan(plan)}
                      title="Delete Plan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Budget Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Total Budget</div>
                  <CurrencyAmountDisplay
                    amount={plan.total_budget}
                    currency={plan.currency}
                    className="font-semibold text-blue-600"
                  />
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Spent</div>
                  <CurrencyAmountDisplay
                    amount={plan.total_spent}
                    currency={plan.currency}
                    className="font-semibold text-red-600"
                  />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Budget Progress</span>
                  <span className="font-medium">{Math.round(progressPercentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      plan.overall_status === 'on_track' 
                        ? 'bg-green-500' 
                        : plan.overall_status === 'warning' 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Status and Remaining */}
              <div className="flex items-center justify-between">
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(plan.overall_status)}`}>
                  {getStatusIcon(plan.overall_status, 'h-3 w-3')}
                  {getStatusText(plan.overall_status)}
                </div>
                
                <div className="text-right">
                  <div className="text-xs text-gray-600">Remaining</div>
                  <CurrencyAmountDisplay
                    amount={plan.total_remaining}
                    currency={plan.currency}
                    className={`text-sm font-medium ${plan.total_remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-2 border-t">
                <div className="flex gap-2">
                  {onViewDetails && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onViewDetails(plan)}
                    >
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  )}
                  
                  {onEditPlan && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onEditPlan(plan)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}