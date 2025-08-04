import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { useExpenseStore } from '../../stores/expense.store'
import { useBudgetStore } from '../../stores/budget.store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { ExpenseForm } from '../../components/forms/ExpenseForm'
import { CurrencyAmountDisplay } from '../../components/ui/currency-amount-display'
import { formatCurrency } from '../../lib/utils'
import { 
  PlusCircle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  Calculator,
  PiggyBank,
  AlertTriangle,
  CheckCircle,
  Target
} from 'lucide-react'
import { CreateExpenseRequest } from '../../types/api.types'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { expenses, totalAmount, fetchExpenses, createExpense, isLoading } = useExpenseStore()
  const { budgetSummary, fetchBudgetSummary, isLoading: isBudgetLoading } = useBudgetStore()
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false)

  useEffect(() => {
    fetchExpenses()
    fetchBudgetSummary()
  }, [fetchExpenses, fetchBudgetSummary])

  // Helper function to calculate expense totals for a given period
  const calculateExpenseTotal = (expenseList: any[]) => {
    return expenseList.reduce((sum, expense) => sum + expense.amount_in_base_currency, 0)
  }

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
  const now = new Date()
  
  const thisMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.expenseDate)
    return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()
  })
  
  const thisMonthTotal = calculateExpenseTotal(thisMonthExpenses)
  
  const lastMonth = new Date()
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  
  const lastMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.expenseDate)
    return expenseDate.getMonth() === lastMonth.getMonth() && expenseDate.getFullYear() === lastMonth.getFullYear()
  })
  
  const lastMonthTotal = calculateExpenseTotal(lastMonthExpenses)
  
  // Calculate monthly change - if no previous month data and current month has data, show 100%
  const monthlyChange = lastMonthTotal > 0 
    ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 
    : thisMonthTotal > 0 ? 100 : 0

  // Calculate proper daily average - total divided by days that have passed in current month
  const currentDay = now.getDate()
  const dailyAverage = thisMonthTotal > 0 ? thisMonthTotal / currentDay : 0

  // Calculate average per transaction
  const averagePerTransaction = thisMonthExpenses.length > 0 ? thisMonthTotal / thisMonthExpenses.length : 0

  // Get unique categories count for this month
  const uniqueCategories = new Set(thisMonthExpenses.map(expense => expense.categoryId)).size

  const recentExpenses = expenses.slice(0, 5)

  const handleAddExpense = async (expenseData: CreateExpenseRequest) => {
    try {
      await createExpense(expenseData)
      setIsExpenseFormOpen(false)
      // Refresh the expenses data
      fetchExpenses()
      console.log('Expense added:', expenses)
    } catch (error) {
      console.error('Failed to add expense:', error)
      alert('Failed to add expense. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p className="text-muted-foreground mt-2">
            Here's your financial overview for {currentMonth}
          </p>
        </div>
        
        <Button className="gap-2" onClick={() => setIsExpenseFormOpen(true)}>
          <PlusCircle className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(thisMonthTotal, user?.defaultCurrency || 'EUR')}
            </div>
            <p className="text-xs text-muted-foreground">
              {thisMonthExpenses.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Change</CardTitle>
            {monthlyChange >= 0 ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${monthlyChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {monthlyChange >= 0 ? '+' : ''}{monthlyChange.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              vs last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Transaction</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(averagePerTransaction, user?.defaultCurrency || 'EUR')}
            </div>
            <p className="text-xs text-muted-foreground">
              {uniqueCategories} categories used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average/Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dailyAverage, user?.defaultCurrency || 'EUR')}
            </div>
            <p className="text-xs text-muted-foreground">
              this month so far
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Overview */}
      {budgetSummary && budgetSummary.budget_count > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Budget Overview</h2>
            <Button variant="outline" onClick={() => navigate('/budget')}>
              View All Budgets
            </Button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Budget */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <CurrencyAmountDisplay 
                    amount={budgetSummary?.total_budget || 0} 
                    currency={user?.defaultCurrency || 'EUR'} 
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {budgetSummary?.budget_count || 0} active {(budgetSummary?.budget_count || 0) === 1 ? 'budget' : 'budgets'}
                </p>
              </CardContent>
            </Card>

            {/* Budget Spent */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budget Spent</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  <CurrencyAmountDisplay 
                    amount={budgetSummary?.total_spent || 0} 
                    currency={user?.defaultCurrency || 'EUR'} 
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(budgetSummary?.overall_percentage || 0)}% of budget used
                </p>
              </CardContent>
            </Card>

            {/* Budget Remaining */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                <PiggyBank className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(budgetSummary?.total_remaining || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <CurrencyAmountDisplay 
                    amount={budgetSummary?.total_remaining || 0} 
                    currency={user?.defaultCurrency || 'EUR'} 
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {(budgetSummary?.total_remaining || 0) >= 0 ? 'Within budget' : 'Over budget'}
                </p>
              </CardContent>
            </Card>

            {/* Budget Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
                {(budgetSummary?.overall_status || 'on_track') === 'on_track' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (budgetSummary?.overall_status || 'on_track') === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  (budgetSummary?.overall_status || 'on_track') === 'on_track' 
                    ? 'text-green-600' 
                    : (budgetSummary?.overall_status || 'on_track') === 'warning' 
                    ? 'text-yellow-600' 
                    : 'text-red-600'
                }`}>
                  {(budgetSummary?.overall_status || 'on_track') === 'on_track' 
                    ? 'On Track' 
                    : (budgetSummary?.overall_status || 'on_track') === 'warning' 
                    ? 'Warning' 
                    : 'Over Budget'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {budgetSummary?.status_counts?.warning || 0} warning, {budgetSummary?.status_counts?.over_budget || 0} over
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Budget Alerts */}
          {((budgetSummary?.status_counts?.warning || 0) > 0 || (budgetSummary?.status_counts?.over_budget || 0) > 0) && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-5 w-5" />
                  Budget Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(budgetSummary?.status_counts?.over_budget || 0) > 0 && (
                    <div className="flex items-center gap-2 text-red-700">
                      <TrendingDown className="h-4 w-4" />
                      <span className="font-medium">
                        {budgetSummary?.status_counts?.over_budget || 0} {(budgetSummary?.status_counts?.over_budget || 0) === 1 ? 'budget is' : 'budgets are'} over limit
                      </span>
                    </div>
                  )}
                  {(budgetSummary?.status_counts?.warning || 0) > 0 && (
                    <div className="flex items-center gap-2 text-yellow-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">
                        {budgetSummary?.status_counts?.warning || 0} {(budgetSummary?.status_counts?.warning || 0) === 1 ? 'budget needs' : 'budgets need'} attention
                      </span>
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={() => navigate('/budget')} className="mt-2">
                    Review Budgets
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Budget CTA for users without budgets */}
      {(!budgetSummary || budgetSummary.budget_count === 0) && !isBudgetLoading && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <PiggyBank className="h-12 w-12 text-blue-600" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900">Set Up Your First Budget</h3>
                <p className="text-blue-700 mt-1">
                  Take control of your spending by creating budgets for different categories or time periods.
                </p>
              </div>
              <Button onClick={() => navigate('/budget')} className="bg-blue-600 hover:bg-blue-700">
                Create Budget
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Your latest expense entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentExpenses.length > 0 ? (
              <div className="space-y-4">
                {recentExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(expense.amount, expense.currency)}
                      </p>
                      {expense.paymentMethod && (
                        <p className="text-sm text-muted-foreground capitalize">
                          {expense.paymentMethod.replace('_', ' ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/expenses')}>
                  View All Transactions
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No transactions yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start tracking your expenses by adding your first transaction.
                </p>
                <Button className="gap-2" onClick={() => setIsExpenseFormOpen(true)}>
                  <PlusCircle className="h-4 w-4" />
                  Add Your First Expense
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Manage your finances efficiently
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={() => setIsExpenseFormOpen(true)}>
              <PlusCircle className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Add Expense</div>
                <div className="text-sm text-muted-foreground">Record a new transaction</div>
              </div>
            </Button>
            
            <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={() => navigate('/budget')}>
              <TrendingUp className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">View Budget</div>
                <div className="text-sm text-muted-foreground">Check spending vs budget</div>
              </div>
            </Button>
            
            <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={() => alert('Export functionality coming soon!')}>
              <Receipt className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Export Data</div>
                <div className="text-sm text-muted-foreground">Download your reports</div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Expense Form Modal */}
      <ExpenseForm
        isOpen={isExpenseFormOpen}
        onClose={() => setIsExpenseFormOpen(false)}
        onSubmit={handleAddExpense}
      />
    </div>
  )
}