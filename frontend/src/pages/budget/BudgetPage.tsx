import React, { useState, useEffect } from 'react'
import { useBudgetStore } from '../../stores/budget.store'
import { useBudgetPlanStore } from '../../stores/budget-plan.store'
import { useExpenseStore } from '../../stores/expense.store'
import { BudgetForm } from '../../components/budgets/BudgetForm'
import { BudgetPerformance } from '../../components/budgets/BudgetPerformance'
import { MonthlyBudgetPlanForm } from '../../components/budgets/MonthlyBudgetPlanForm'
import { MonthlyBudgetPlanList } from '../../components/budgets/MonthlyBudgetPlanList'
import { Budget } from '../../types/api.types'
import { MonthlyBudgetPlanSummary, CreateMonthlyBudgetPlanRequest } from '../../types/budget-plan.types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { PlusCircle, BarChart3, List, AlertTriangle, Calendar, Target, Loader2 } from 'lucide-react'

export function BudgetPage() {
  const {
    budgets,
    budgetSummary,
    budgetPerformances,
    isLoading,
    error,
    fetchBudgets,
    fetchBudgetSummary,
    createBudget,
    updateBudget,
    deleteBudget,
    getBudgetPerformance,
    clearError
  } = useBudgetStore()

  const {
    monthlyPlans,
    isLoading: isPlansLoading,
    isCreating: isCreatingPlan,
    error: planError,
    fetchMonthlyPlans,
    fetchMonthlyPlan,
    createMonthlyPlan,
    deleteMonthlyPlan,
    duplicateMonthlyPlan,
    clearError: clearPlanError
  } = useBudgetPlanStore()

  const {
    categories,
    categoryTree,
    currencies,
    fetchCategories,
    fetchCategoryTree,
    fetchCurrencies
  } = useExpenseStore()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<MonthlyBudgetPlanSummary | null>(null)
  const [viewMode, setViewMode] = useState<'monthly-plans' | 'individual-budgets' | 'performance'>('monthly-plans')

  // Fetch data on component mount
  useEffect(() => {
    fetchBudgets()
    fetchBudgetSummary()
    fetchMonthlyPlans()
    
    if (categories.length === 0) {
      fetchCategories()
    }
    if (categoryTree.length === 0) {
      fetchCategoryTree()
    }
    if (currencies.length === 0) {
      fetchCurrencies()
    }
  }, [])

  // Clear errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  useEffect(() => {
    if (planError) {
      const timer = setTimeout(() => {
        clearPlanError()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [planError, clearPlanError])

  const handleCreateBudget = () => {
    setEditingBudget(null)
    setIsFormOpen(true)
  }

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget)
    setIsFormOpen(true)
  }

  const handleDeleteBudget = async (budget: Budget) => {
    if (window.confirm(`Are you sure you want to delete the budget "${budget.name}"?`)) {
      try {
        await deleteBudget(budget.id)
      } catch (error) {
        console.error('Failed to delete budget:', error)
      }
    }
  }

  const handleFormSubmit = async (data: any) => {
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, data)
      } else {
        await createBudget(data)
      }
      setIsFormOpen(false)
      setEditingBudget(null)
    } catch (error) {
      console.error('Failed to save budget:', error)
      throw error
    }
  }

  const handleLoadPerformance = async (budgetId: string) => {
    try {
      await getBudgetPerformance(budgetId)
    } catch (error) {
      console.error('Failed to load budget performance:', error)
    }
  }

  // Monthly Budget Plan handlers
  const handleCreateMonthlyPlan = () => {
    setEditingPlan(null)
    setIsPlanFormOpen(true)
  }

  const handleEditMonthlyPlan = async (plan: MonthlyBudgetPlanSummary) => {
    try {
      // Fetch detailed plan data with category budgets
      await fetchMonthlyPlan(plan.year, plan.month)
      setEditingPlan(plan)
      setIsPlanFormOpen(true)
    } catch (error) {
      console.error('Failed to fetch detailed plan data:', error)
      // Fallback to summary data if detailed fetch fails
      setEditingPlan(plan)
      setIsPlanFormOpen(true)
    }
  }

  const handleDeleteMonthlyPlan = async (plan: MonthlyBudgetPlanSummary) => {
    if (window.confirm(`Are you sure you want to delete the budget plan for ${plan.name}?`)) {
      try {
        await deleteMonthlyPlan(plan.year, plan.month)
      } catch (error) {
        console.error('Failed to delete monthly plan:', error)
      }
    }
  }

  const handleDuplicateMonthlyPlan = async (plan: MonthlyBudgetPlanSummary) => {
    const currentDate = new Date()
    const nextMonth = currentDate.getMonth() + 1
    const nextYear = nextMonth > 12 ? currentDate.getFullYear() + 1 : currentDate.getFullYear()
    const targetMonth = nextMonth > 12 ? 1 : nextMonth

    try {
      await duplicateMonthlyPlan(plan.year, plan.month, nextYear, targetMonth)
    } catch (error) {
      console.error('Failed to duplicate monthly plan:', error)
    }
  }

  const handleMonthlyPlanFormSubmit = async (data: CreateMonthlyBudgetPlanRequest) => {
    try {
      if (editingPlan) {
        // TODO: Handle editing when backend supports it
        console.log('Editing plan not yet implemented:', editingPlan)
      } else {
        await createMonthlyPlan(data)
      }
      setIsPlanFormOpen(false)
      setEditingPlan(null)
    } catch (error) {
      console.error('Failed to save monthly plan:', error)
      throw error
    }
  }

  if (isLoading && monthlyPlans.length === 0 && budgets.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading budgets...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budget Management</h1>
          <p className="text-muted-foreground">
            Set and track your spending budgets with monthly plans and detailed insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <Button
              variant={viewMode === 'monthly-plans' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('monthly-plans')}
              className="h-8"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Monthly Plans
            </Button>
            <Button
              variant={viewMode === 'performance' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('performance')}
              className="h-8"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Performance
            </Button>
            <Button
              variant={viewMode === 'individual-budgets' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('individual-budgets')}
              className="h-8"
            >
              <List className="h-4 w-4 mr-2" />
              Individual
            </Button>
          </div>
          
          {viewMode === 'monthly-plans' ? (
            <Button className="gap-2" onClick={handleCreateMonthlyPlan}>
              <Calendar className="h-4 w-4" />
              Create Monthly Plan
            </Button>
          ) : (
            <Button className="gap-2" onClick={handleCreateBudget}>
              <PlusCircle className="h-4 w-4" />
              Create Budget
            </Button>
          )}
        </div>
      </div>

      {/* Error Alerts */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {planError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Plan Error:</span>
              <span>{planError}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Summary - Always Visible */}
      {viewMode === 'performance' && (
        <div className="w-full">
          <BudgetPerformance 
            budgetSummary={budgetSummary} 
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="w-full">
        {viewMode === 'monthly-plans' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {monthlyPlans.length > 0 
                      ? `${monthlyPlans.length} Monthly Plan${monthlyPlans.length !== 1 ? 's' : ''}` 
                      : 'Monthly Budget Plans'
                    }
                  </CardTitle>
                  <CardDescription>
                    {monthlyPlans.length > 0 
                      ? 'Manage your comprehensive monthly budget plans'
                      : 'Create your first monthly budget plan to get started'
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {monthlyPlans.length > 0 ? (
                <MonthlyBudgetPlanList
                  plans={monthlyPlans}
                  onEditPlan={handleEditMonthlyPlan}
                  onDeletePlan={handleDeleteMonthlyPlan}
                  onDuplicatePlan={handleDuplicateMonthlyPlan}
                  isLoading={isPlansLoading}
                />
              ) : (
                <div className="text-center py-12">
                  <Target className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No monthly plans found</h3>
                  <p className="text-muted-foreground mb-6">
                    Start managing your budget with a comprehensive monthly plan that covers all your expense categories.
                  </p>
                  <Button className="gap-2" onClick={handleCreateMonthlyPlan}>
                    <Calendar className="h-4 w-4" />
                    Create Your First Monthly Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {viewMode === 'individual-budgets' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {budgets.length > 0 
                      ? `${budgets.length} Individual Budget${budgets.length !== 1 ? 's' : ''}` 
                      : 'Individual Budgets'
                    }
                  </CardTitle>
                  <CardDescription>
                    {budgets.length > 0 
                      ? 'View and manage your individual category budgets'
                      : 'Create individual budgets for specific categories'
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {budgets.length > 0 ? (
                <div className="space-y-4">
                  {budgets.map((budget) => (
                    <div key={budget.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{budget.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {budget.periodType} • {budget.currency} {budget.amount}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditBudget(budget)}>
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteBudget(budget)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No individual budgets found</h3>
                  <p className="text-muted-foreground mb-6">
                    Create specific budgets for individual categories or time periods.
                  </p>
                  <Button className="gap-2" onClick={handleCreateBudget}>
                    <PlusCircle className="h-4 w-4" />
                    Create Your First Budget
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Budget Form Modal */}
      <BudgetForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingBudget(null)
        }}
        onSubmit={handleFormSubmit}
        editingBudget={editingBudget}
        categoryTree={categoryTree}
        currencies={currencies}
        isLoading={isLoading}
      />

      {/* Monthly Budget Plan Form Modal */}
      <MonthlyBudgetPlanForm
        isOpen={isPlanFormOpen}
        onClose={() => {
          setIsPlanFormOpen(false)
          setEditingPlan(null)
        }}
        onSubmit={handleMonthlyPlanFormSubmit}
        editingPlan={editingPlan}
        categoryTree={categoryTree}
        currencies={currencies}
        isLoading={isCreatingPlan}
      />
    </div>
  )
}