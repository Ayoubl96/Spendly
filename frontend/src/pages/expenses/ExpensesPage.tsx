import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { ExpenseForm } from '../../components/forms/ExpenseForm'
import { ExpenseFilters } from '../../components/expenses/ExpenseFilters'
import { ExpenseCard } from '../../components/expenses/ExpenseCard'
import { CategorySummary } from '../../components/expenses/CategorySummary'
import { useExpenseStore } from '../../stores/expense.store'
// import { useAuthStore } from '../../stores/auth.store' // Not used currently
import { PlusCircle, Receipt, BarChart3, List, Loader2, Upload } from 'lucide-react'
import { CreateExpenseRequest, ExpenseFilters as ExpenseFiltersType } from '../../types/api.types'

export function ExpensesPage() {
  const navigate = useNavigate()
  // const { user } = useAuthStore() // Commented out as not used currently
  const { 
    expenses, 
    categoryTree, 
    fetchExpenses, 
    fetchCategoryTree, 
    createExpense, 
    updateExpense,
    deleteExpense, 
    isLoading,
    filters 
  } = useExpenseStore()
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false)
  const [currentEditExpense, setCurrentEditExpense] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'summary' | 'list'>('summary')

  useEffect(() => {
    fetchExpenses()
    fetchCategoryTree()
  }, [fetchExpenses, fetchCategoryTree])

  const handleAddExpense = async (expenseData: CreateExpenseRequest) => {
    try {
      await createExpense(expenseData)
      setIsExpenseFormOpen(false)
      setCurrentEditExpense(null)
      fetchExpenses()
    } catch (error) {
      console.error('Failed to add expense:', error)
      alert('Failed to add expense. Please try again.')
    }
  }

  const handleUpdateExpense = async (expenseData: CreateExpenseRequest) => {
    if (!currentEditExpense?.id) return
    
    try {
      await updateExpense(currentEditExpense.id, expenseData)
      setIsExpenseFormOpen(false)
      setCurrentEditExpense(null)
      fetchExpenses()
    } catch (error) {
      console.error('Failed to update expense:', error)
      alert('Failed to update expense. Please try again.')
    }
  }

  const handleExpenseSubmit = currentEditExpense ? handleUpdateExpense : handleAddExpense

  const handleEditExpense = (expense: any) => {
    setCurrentEditExpense(expense)
    setIsExpenseFormOpen(true)
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

  const handleFiltersChange = (newFilters: ExpenseFiltersType) => {
    // Filters are automatically applied through the store
    console.log('Filters changed:', newFilters)
  }

  // Get category and subcategory info for each expense
  const getExpenseCategory = (expense: any) => {
    // First check if it's a primary category
    const primaryCategory = categoryTree.find(cat => cat.id === expense.categoryId)
    if (primaryCategory) return primaryCategory
    
    // Then check if it's a subcategory and return its parent
    for (const primaryCat of categoryTree) {
      const subcategory = primaryCat.subcategories.find(sub => sub.id === expense.categoryId)
      if (subcategory) return primaryCat
    }
    return undefined
  }

  const getExpenseSubcategory = (expense: any) => {
    if (!expense.subcategoryId) return undefined
    
    for (const primaryCat of categoryTree) {
      const subcategory = primaryCat.subcategories.find(sub => sub.id === expense.subcategoryId)
      if (subcategory) return subcategory
    }
    return undefined
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading expenses...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Track and manage all your expenses with advanced filtering and insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Import Button */}
          <Button
            variant="outline"
            onClick={() => navigate('/expenses/import')}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Import Expenses
          </Button>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <Button
              variant={viewMode === 'summary' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('summary')}
              className="h-8"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Summary
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8"
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
          </div>
          
          <Button className="gap-2" onClick={() => {
            setCurrentEditExpense(null)
            setIsExpenseFormOpen(true)
          }}>
            <PlusCircle className="h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Filters */}
      <ExpenseFilters onFiltersChange={handleFiltersChange} />

      {/* Summary Row - Always Visible */}
      {viewMode === 'summary' && (
        <div className="w-full">
          <CategorySummary 
            expenses={expenses} 
            dateRange={{
              startDate: filters.startDate,
              endDate: filters.endDate
            }}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="w-full">
        {/* Expenses List */}
        <div className="w-full">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {expenses.length > 0 
                      ? `${expenses.length} Expense${expenses.length !== 1 ? 's' : ''}` 
                      : 'All Expenses'
                    }
                  </CardTitle>
                  <CardDescription>
                    {expenses.length > 0 
                      ? 'View and manage your expense history'
                      : 'No expenses found matching your filters'
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {expenses.length > 0 ? (
                <div className="space-y-4">
                  {expenses.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      category={getExpenseCategory(expense)}
                      subcategory={getExpenseSubcategory(expense)}
                      onEdit={handleEditExpense}
                      onDelete={handleDeleteExpense}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No expenses found</h3>
                  <p className="text-muted-foreground mb-6">
                    {Object.keys(filters).length > 0 
                      ? 'Try adjusting your filters or add a new expense to get started.'
                      : 'Start tracking your expenses by adding your first transaction.'
                    }
                  </p>
                  <Button className="gap-2" onClick={() => {
                    setCurrentEditExpense(null)
                    setIsExpenseFormOpen(true)
                  }}>
                    <PlusCircle className="h-4 w-4" />
                    Add Your First Expense
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Expense Form Modal */}
      <ExpenseForm
        isOpen={isExpenseFormOpen}
        onClose={() => {
          setIsExpenseFormOpen(false)
          setCurrentEditExpense(null)
        }}
        onSubmit={handleExpenseSubmit}
        editExpense={currentEditExpense}
      />
    </div>
  )
}