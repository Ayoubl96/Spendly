import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { useExpenseStore } from '../../stores/expense.store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { ExpenseForm } from '../../components/forms/ExpenseForm'
import { formatCurrency } from '../../lib/utils'
import { PlusCircle, TrendingUp, TrendingDown, DollarSign, Receipt } from 'lucide-react'
import { CreateExpenseRequest } from '../../types/api.types'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { expenses, totalAmount, fetchExpenses, createExpense, isLoading } = useExpenseStore()
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false)

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
  const thisMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.expenseDate)
    const now = new Date()
    return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()
  })
  
  const thisMonthTotal = thisMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const lastMonth = new Date()
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  
  const lastMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.expenseDate)
    return expenseDate.getMonth() === lastMonth.getMonth() && expenseDate.getFullYear() === lastMonth.getFullYear()
  })
  
  const lastMonthTotal = lastMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const monthlyChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0

  const recentExpenses = expenses.slice(0, 5)

  const handleAddExpense = async (expenseData: CreateExpenseRequest) => {
    try {
      await createExpense(expenseData)
      setIsExpenseFormOpen(false)
      // Refresh the expenses data
      fetchExpenses()
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
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalAmount, user?.defaultCurrency || 'EUR')}
            </div>
            <p className="text-xs text-muted-foreground">
              {expenses.length} total transactions
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
              {formatCurrency(
                thisMonthExpenses.length > 0 
                  ? thisMonthTotal / new Date().getDate() 
                  : 0, 
                user?.defaultCurrency || 'EUR'
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              daily average
            </p>
          </CardContent>
        </Card>
      </div>

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