import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { ExpenseForm } from '../../components/forms/ExpenseForm'
import { useExpenseStore } from '../../stores/expense.store'
import { useAuthStore } from '../../stores/auth.store'
import { formatCurrency, formatDate } from '../../lib/utils'
import { PlusCircle, Receipt, Trash2, Edit } from 'lucide-react'
import { CreateExpenseRequest } from '../../types/api.types'

export function ExpensesPage() {
  const { user } = useAuthStore()
  const { expenses, fetchExpenses, createExpense, deleteExpense, isLoading } = useExpenseStore()
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false)

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const handleAddExpense = async (expenseData: CreateExpenseRequest) => {
    try {
      await createExpense(expenseData)
      setIsExpenseFormOpen(false)
      fetchExpenses()
    } catch (error) {
      console.error('Failed to add expense:', error)
      alert('Failed to add expense. Please try again.')
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteExpense(id)
      } catch (error) {
        console.error('Failed to delete expense:', error)
        alert('Failed to delete expense. Please try again.')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Track and manage all your expenses
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsExpenseFormOpen(true)}>
          <PlusCircle className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
          <CardDescription>
            View and manage your expense history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <div className="space-y-4">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Receipt className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(expense.expenseDate)} • {expense.paymentMethod?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        {expense.categoryId && (
                          <p className="text-xs text-muted-foreground capitalize">
                            Category ID: {expense.categoryId}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium text-lg">
                        {formatCurrency(expense.amount, expense.currency)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => alert('Edit functionality coming soon!')}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Receipt className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No expenses yet</h3>
              <p className="text-muted-foreground mb-6">
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

      {/* Expense Form Modal */}
      <ExpenseForm
        isOpen={isExpenseFormOpen}
        onClose={() => setIsExpenseFormOpen(false)}
        onSubmit={handleAddExpense}
      />
    </div>
  )
}