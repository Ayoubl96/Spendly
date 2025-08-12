import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBudgetGroupStore } from '../../stores/budget-group.store'
import { useBudgetStore } from '../../stores/budget.store'
import { useExpenseStore } from '../../stores/expense.store'
import { useAuthStore } from '../../stores/auth.store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { CurrencyAmountDisplay } from '../../components/ui/currency-amount-display'
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Target,
  TrendingUp,
  AlertTriangle,
  Settings,
  Calculator,
  Loader2
} from 'lucide-react'
import { Budget, BudgetGroup, BudgetGroupSummary, Category } from '../../types/api.types'
import { IconRenderer } from '../../utils/iconRenderer'

interface EditingBudget {
  budgetId?: string
  categoryId: string
  categoryName: string
  amount: number | string
  isNew?: boolean
}

interface BudgetItemProps {
  categoryId: string
  categoryName: string
  categoryIcon?: string
  categoryColor?: string
  budget?: Budget
  spent: number
  remaining: number
  percentage: number
  isSubcategory?: boolean
  onEdit: (editingBudget: EditingBudget) => void
  onDelete?: (budget: Budget) => void
  onAdd?: (categoryId: string, categoryName: string) => void
}

const BudgetItem: React.FC<BudgetItemProps> = ({
  categoryId,
  categoryName,
  categoryIcon,
  categoryColor,
  budget,
  spent,
  remaining,
  percentage,
  isSubcategory = false,
  onEdit,
  onDelete,
  onAdd
}) => {
  const getStatusColor = () => {
    if (!budget) return 'gray'
    if (percentage <= 50) return 'green'
    if (percentage <= 80) return 'yellow'
    return 'red'
  }

  const statusColor = getStatusColor()

  return (
    <div className={`p-4 border rounded-lg ${isSubcategory ? 'bg-gray-50 ml-6' : 'bg-white'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          {/* Category Icon */}
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium"
            style={{ backgroundColor: categoryColor || '#6b7280' }}
          >
            {categoryIcon ? (
              <IconRenderer icon={categoryIcon} size={16} className="text-white" />
            ) : (
              <span className="text-sm">{categoryName.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {/* Category Info */}
          <div className="flex-1">
            <h3 className={`font-medium ${isSubcategory ? 'text-gray-700' : 'text-gray-900'}`}>
              {categoryName}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Spent: <CurrencyAmountDisplay amount={spent} currency="EUR" /></span>
              {budget && (
                <span>Remaining: <CurrencyAmountDisplay amount={remaining} currency="EUR" /></span>
              )}
              {budget && (
                <span className={`font-medium ${
                  statusColor === 'green' ? 'text-green-600' :
                  statusColor === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {(Number(percentage) || 0).toFixed(1)}% used
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Budget Amount & Actions */}
        <div className="flex items-center gap-4">
          {/* Budget Amount */}
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Budget</div>
            {budget ? (
              <div className="font-semibold">
                <CurrencyAmountDisplay amount={budget.amount} currency={budget.currency} />
              </div>
            ) : (
              <div className="text-gray-400 text-sm">Not set</div>
            )}
          </div>

          {/* Progress Bar */}
          {budget && (
            <div className="w-24">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    statusColor === 'green' ? 'bg-green-500' :
                    statusColor === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {budget ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit({
                    budgetId: budget.id,
                    categoryId,
                    categoryName,
                    amount: budget.amount
                  })}
                  className="text-blue-600 hover:text-blue-800 h-8 w-8 p-0"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(budget)}
                    className="text-red-600 hover:text-red-800 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </>
            ) : (
              onAdd && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAdd(categoryId, categoryName)}
                  className="text-green-600 hover:text-green-800 h-8 w-8 p-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function BudgetManagementPage() {
  const { id: budgetGroupId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Store hooks
  const {
    currentBudgetGroup,
    budgetGroupSummary,
    getBudgetGroupWithBudgets,
    getBudgetGroupSummary,
    bulkUpdateBudgets,
    updateBudgetGroup,
    isLoading: isGroupLoading,
    error: groupError
  } = useBudgetGroupStore()

  const {
    createBudget,
    updateBudget,
    deleteBudget,
    isLoading: isBudgetLoading
  } = useBudgetStore()

  const {
    categoryTree,
    currencies,
    fetchCategoryTree,
    fetchCurrencies
  } = useExpenseStore()

  // Local state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [editingBudgets, setEditingBudgets] = useState<Record<string, EditingBudget>>({})
  const [editingGroupInfo, setEditingGroupInfo] = useState(false)
  const [groupEditValues, setGroupEditValues] = useState({
    name: '',
    description: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Initialize data
  useEffect(() => {
    if (budgetGroupId) {
      getBudgetGroupWithBudgets(budgetGroupId)
      getBudgetGroupSummary(budgetGroupId)
    }
    fetchCategoryTree()
    fetchCurrencies()
  }, [budgetGroupId, getBudgetGroupWithBudgets, getBudgetGroupSummary, fetchCategoryTree, fetchCurrencies])

  // Initialize group edit values when data loads
  useEffect(() => {
    if (budgetGroupSummary?.budget_group) {
      setGroupEditValues({
        name: budgetGroupSummary.budget_group.name,
        description: budgetGroupSummary.budget_group.description || ''
      })
    }
  }, [budgetGroupSummary])

  // Create budget map for easy lookup (with refresh key to force re-render)
  const budgetMap = React.useMemo(() => {
    const map = new Map<string, Budget>()
    
    if (currentBudgetGroup?.budgets) {
      console.log('🔄 Creating budget map. Budgets found:', currentBudgetGroup.budgets.length)
      currentBudgetGroup.budgets.forEach(budget => {
        console.log(`📊 Budget: "${budget.name}" (${budget.amount} ${budget.currency}) -> Category: ${budget.categoryId}`)
        if (budget.categoryId) {
          map.set(budget.categoryId, budget)
        }
      })
      console.log('📋 Final budget map size:', map.size)
    } else {
      console.log('❌ No budgets found in currentBudgetGroup')
    }
    
    return map
  }, [currentBudgetGroup?.budgets, refreshKey])

  // Get category info from tree
  const getCategoryInfo = useCallback((categoryId: string) => {
    for (const primaryCategory of categoryTree) {
      if (primaryCategory.id === categoryId) {
        return {
          name: primaryCategory.name,
          icon: primaryCategory.icon,
          color: primaryCategory.color,
          isPrimary: true
        }
      }
      for (const subcategory of primaryCategory.subcategories || []) {
        if (subcategory.id === categoryId) {
          return {
            name: subcategory.name,
            icon: subcategory.icon,
            color: primaryCategory.color, // Use parent color
            isPrimary: false
          }
        }
      }
    }
    return null
  }, [categoryTree])

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName)
      } else {
        newSet.add(categoryName)
      }
      return newSet
    })
  }

  const handleEditBudget = (editingBudget: EditingBudget) => {
    setEditingBudgets(prev => ({
      ...prev,
      [editingBudget.categoryId]: editingBudget
    }))
    setHasChanges(true)
  }

  const handleCancelEdit = (categoryId: string) => {
    setEditingBudgets(prev => {
      const newEditing = { ...prev }
      delete newEditing[categoryId]
      return newEditing
    })
    
    // Check if we still have changes
    const remainingEdits = Object.keys(editingBudgets).filter(id => id !== categoryId)
    setHasChanges(remainingEdits.length > 0 || editingGroupInfo)
  }

  const handleAmountChange = (categoryId: string, newAmount: number | string) => {
    setEditingBudgets(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        amount: typeof newAmount === 'string' ? newAmount : newAmount
      }
    }))
  }

  const handleAmountBlur = (categoryId: string, value: string) => {
    const numValue = Number(value)
    // If invalid or negative, default to 0 (zero is now allowed)
    const validAmount = isNaN(numValue) || numValue < 0 ? 0 : numValue
    
    setEditingBudgets(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        amount: validAmount
      }
    }))
  }

  const handleAddNewBudget = (categoryId: string, categoryName: string) => {
    setEditingBudgets(prev => ({
      ...prev,
      [categoryId]: {
        categoryId,
        categoryName,
        amount: 100, // Default amount
        isNew: true
      }
    }))
    setHasChanges(true)
  }

  const handleDeleteBudget = async (budget: Budget) => {
    if (window.confirm(`Are you sure you want to delete the budget for "${budget.name}"?`)) {
      try {
        await deleteBudget(budget.id)
        // Refresh data
        if (budgetGroupId) {
          await getBudgetGroupWithBudgets(budgetGroupId)
          await getBudgetGroupSummary(budgetGroupId)
        }
      } catch (error) {
        console.error('Failed to delete budget:', error)
        alert('Failed to delete budget. Please try again.')
      }
    }
  }

  const handleSaveAll = async () => {
    if (!budgetGroupId || !budgetGroupSummary?.budget_group) return

    setIsSaving(true)
    try {
      // 1. Update budget group info if changed
      if (editingGroupInfo) {
        await updateBudgetGroup(budgetGroupId, {
          name: groupEditValues.name,
          description: groupEditValues.description
        })
        setEditingGroupInfo(false)
      }

      // 2. Handle budget updates and creations
      const editEntries = Object.entries(editingBudgets)
      
      if (editEntries.length > 0) {
        // Separate new budgets from updates
        const newBudgets: EditingBudget[] = []
        const updatedBudgets: EditingBudget[] = []

        editEntries.forEach(([_, editingBudget]) => {
          if (editingBudget.isNew) {
            newBudgets.push(editingBudget)
          } else {
            updatedBudgets.push(editingBudget)
          }
        })

        // Create new budgets
        for (const newBudget of newBudgets) {
          await createBudget({
            name: `${newBudget.categoryName} Budget`,
            amount: typeof newBudget.amount === 'string' ? Number(newBudget.amount) || 0 : newBudget.amount,
            currency: budgetGroupSummary.budget_group.currency,
            budgetGroupId: budgetGroupId,
            categoryId: newBudget.categoryId,
            periodType: budgetGroupSummary.budget_group.periodType as 'monthly' | 'yearly' | 'custom' | 'weekly',
            startDate: budgetGroupSummary.budget_group.startDate,
            endDate: budgetGroupSummary.budget_group.endDate
          })
        }

        // Bulk update existing budgets
        if (updatedBudgets.length > 0) {
          await bulkUpdateBudgets(budgetGroupId, {
            items: updatedBudgets.map(budget => ({
              budget_id: budget.budgetId,
              category_id: budget.categoryId,
              amount: typeof budget.amount === 'string' ? Number(budget.amount) || 0 : budget.amount
            }))
          })
        }
      }

      // Clear editing state
      setEditingBudgets({})
      setHasChanges(false)

      // Refresh data
      await getBudgetGroupWithBudgets(budgetGroupId)
      await getBudgetGroupSummary(budgetGroupId)
      
      // Force component re-render by incrementing refresh key
      setRefreshKey(prev => prev + 1)

      alert('All changes saved successfully!')
    } catch (error) {
      console.error('Failed to save changes:', error)
      alert('Failed to save some changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelAll = () => {
    setEditingBudgets({})
    setEditingGroupInfo(false)
    setHasChanges(false)
    if (budgetGroupSummary?.budget_group) {
      setGroupEditValues({
        name: budgetGroupSummary.budget_group.name,
        description: budgetGroupSummary.budget_group.description || ''
      })
    }
  }

  if (!budgetGroupId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Budget Group ID Required</h1>
          <p className="text-gray-600 mb-4">Please select a budget group to manage.</p>
          <Button onClick={() => navigate('/budget')}>
            Go to Budget Overview
          </Button>
        </div>
      </div>
    )
  }

  if (isGroupLoading || !budgetGroupSummary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading budget group details...</p>
        </div>
      </div>
    )
  }

  if (groupError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Budget Group</h1>
          <p className="text-gray-600 mb-4">{groupError}</p>
          <Button onClick={() => navigate('/budget')}>
            Go to Budget Overview
          </Button>
        </div>
      </div>
    )
  }

  const { budget_group: budgetGroup } = budgetGroupSummary

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/budget')} className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Budget Management</h1>
              <p className="text-gray-600">
                Manage budgets for {budgetGroup.name} • {budgetGroup.periodType} period
              </p>
            </div>
          </div>
          
          {/* Save/Cancel Actions */}
          {hasChanges && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleCancelAll}
                disabled={isSaving}
              >
                Cancel Changes
              </Button>
              <Button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save All Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* High-Level Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Budget</p>
                  <p className="text-2xl font-bold">
                    <CurrencyAmountDisplay 
                      amount={budgetGroupSummary.total_budgeted} 
                      currency={budgetGroup.currency} 
                    />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Spent</p>
                  <p className="text-2xl font-bold">
                    <CurrencyAmountDisplay 
                      amount={budgetGroupSummary.total_spent} 
                      currency={budgetGroup.currency} 
                    />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calculator className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Progress</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-bold ${
                      budgetGroupSummary.percentage_used <= 80 ? 'text-green-600' :
                      budgetGroupSummary.percentage_used <= 100 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {budgetGroupSummary.percentage_used.toFixed(1)}%
                    </p>
                    <div className="w-16 h-2 bg-gray-200 rounded-full">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          budgetGroupSummary.percentage_used <= 80 ? 'bg-green-500' :
                          budgetGroupSummary.percentage_used <= 100 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(budgetGroupSummary.percentage_used, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Settings className="w-8 h-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Remaining</p>
                  <p className={`text-2xl font-bold ${
                    budgetGroupSummary.total_remaining >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <CurrencyAmountDisplay 
                      amount={budgetGroupSummary.total_remaining} 
                      currency={budgetGroup.currency} 
                    />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget Group Info Editor */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Budget Group Information
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingGroupInfo(!editingGroupInfo)}
                className="text-blue-600 hover:text-blue-800"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {editingGroupInfo ? 'Cancel' : 'Edit'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {editingGroupInfo ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget Group Name
                  </label>
                  <Input
                    value={groupEditValues.name}
                    onChange={(e) => {
                      setGroupEditValues(prev => ({ ...prev, name: e.target.value }))
                      setHasChanges(true)
                    }}
                    placeholder="Enter budget group name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <Input
                    value={groupEditValues.description}
                    onChange={(e) => {
                      setGroupEditValues(prev => ({ ...prev, description: e.target.value }))
                      setHasChanges(true)
                    }}
                    placeholder="Optional description"
                  />
                </div>
              </div>
            ) : (
              <div>
                <h3 className="font-semibold text-lg">{budgetGroup.name}</h3>
                {budgetGroup.description && (
                  <p className="text-gray-600 mt-1">{budgetGroup.description}</p>
                )}
                <div className="flex items-center gap-6 mt-3 text-sm text-gray-500">
                  <span>Period: {budgetGroup.periodType}</span>
                  <span>From: {new Date(budgetGroup.startDate).toLocaleDateString()}</span>
                  <span>To: {new Date(budgetGroup.endDate).toLocaleDateString()}</span>
                  <span>Currency: {budgetGroup.currency}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Categories List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Budget Categories
            </CardTitle>
            <CardDescription>
              Manage budget amounts for each category. Click + to add budgets for categories without them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryTree.length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Budget Categories</h3>
                <p className="text-gray-500">
                  No categories have been set up for this budget group yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {categoryTree.map((primaryCategory) => {
                  const categorySummary = budgetGroupSummary.category_summaries[primaryCategory.name]
                  const hasSubcategories = primaryCategory.subcategories && primaryCategory.subcategories.length > 0
                  const isExpanded = expandedCategories.has(primaryCategory.name)
                  
                  // Try to find budget by category ID from both the map and category summary
                  let budget = budgetMap.get(primaryCategory.id)
                  console.log(`🔍 Looking for budget for category "${primaryCategory.name}" (${primaryCategory.id}):`, budget ? `Found: ${budget.name}` : 'Not found')
                  
                  // If no budget found by primary category ID, check if there's one in the summary
                  if (!budget && categorySummary?.categoryId) {
                    budget = budgetMap.get(categorySummary.categoryId)
                    console.log(`🔍 Tried categorySummary.categoryId (${categorySummary.categoryId}):`, budget ? `Found: ${budget.name}` : 'Not found')
                  }
                  
                  const editingBudget = editingBudgets[primaryCategory.id]

                  const spent = Number(categorySummary?.spent) || 0
                  const remaining = Number(categorySummary?.remaining) || 0
                  const percentage = Number(categorySummary?.percentage_used) || 0

                  return (
                    <div key={primaryCategory.id} className="space-y-2">
                      {/* Main Category */}
                      <div className="flex items-center gap-3">
                        {/* Expand/Collapse for categories with subcategories */}
                        {hasSubcategories && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCategory(primaryCategory.name)}
                            className="p-1 h-8 w-8"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        
                        <div className="flex-1">
                          {editingBudget ? (
                            <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium"
                                    style={{ backgroundColor: primaryCategory.color || '#6b7280' }}
                                  >
                                    {primaryCategory.icon ? (
                                      <IconRenderer icon={primaryCategory.icon} size={16} className="text-white" />
                                    ) : (
                                      <span className="text-sm">{primaryCategory.name.charAt(0).toUpperCase()}</span>
                                    )}
                                  </div>
                                  <div>
                                    <h3 className="font-medium text-gray-900">{primaryCategory.name}</h3>
                                    <div className="text-sm text-gray-500">
                                      {editingBudget.isNew ? 'Creating new budget' : 'Editing budget amount'}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">Budget Amount:</span>
                                    <Input
                                      type="number"
                                      value={editingBudget.amount}
                                      onChange={(e) => handleAmountChange(primaryCategory.id, e.target.value)}
                                      onBlur={(e) => handleAmountBlur(primaryCategory.id, e.target.value)}
                                      className="w-32"
                                      min="0"
                                      step="0.01"
                                      autoFocus
                                    />
                                    <span className="text-sm text-gray-500">{budgetGroup.currency}</span>
                                  </div>
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancelEdit(primaryCategory.id)}
                                    className="text-gray-600 hover:text-gray-800"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <BudgetItem
                              categoryId={primaryCategory.id}
                              categoryName={primaryCategory.name}
                              categoryIcon={primaryCategory.icon}
                              categoryColor={primaryCategory.color}
                              budget={budget}
                              spent={spent}
                              remaining={remaining}
                              percentage={percentage}
                              onEdit={handleEditBudget}
                              onDelete={handleDeleteBudget}
                              onAdd={handleAddNewBudget}
                            />
                          )}
                        </div>
                      </div>

                      {/* Subcategories */}
                      {hasSubcategories && isExpanded && (
                        <div className="space-y-2">
                          {primaryCategory.subcategories.map((subcategory) => {
                            const subSummary = categorySummary?.subcategories?.[subcategory.name]
                            
                            // Try to find budget by subcategory ID from both the map and summary
                            let subBudget = budgetMap.get(subcategory.id)
                            
                            // If no budget found by subcategory ID, check if there's one in the summary
                            if (!subBudget && subSummary?.categoryId) {
                              subBudget = budgetMap.get(subSummary.categoryId)
                            }
                            
                            const editingSubBudget = editingBudgets[subcategory.id]

                            const subSpent = Number(subSummary?.spent) || 0
                            const subRemaining = Number(subSummary?.remaining) || 0
                            const subPercentage = Number(subSummary?.percentage_used) || 0

                            return (
                              <div key={subcategory.id}>
                                {editingSubBudget ? (
                                  <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50 ml-6">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div 
                                          className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-medium"
                                          style={{ backgroundColor: primaryCategory.color || '#6b7280' }}
                                        >
                                          {subcategory.icon ? (
                                            <IconRenderer icon={subcategory.icon} size={12} className="text-white" />
                                          ) : (
                                            <span>{subcategory.name.charAt(0).toUpperCase()}</span>
                                          )}
                                        </div>
                                        <div>
                                          <h4 className="font-medium text-gray-700">{subcategory.name}</h4>
                                          <div className="text-sm text-gray-500">
                                            {editingSubBudget.isNew ? 'Creating new budget' : 'Editing budget amount'}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm text-gray-600">Budget Amount:</span>
                                          <Input
                                            type="number"
                                            value={editingSubBudget.amount}
                                            onChange={(e) => handleAmountChange(subcategory.id, e.target.value)}
                                            onBlur={(e) => handleAmountBlur(subcategory.id, e.target.value)}
                                            className="w-32"
                                            min="0"
                                            step="0.01"
                                            autoFocus
                                          />
                                          <span className="text-sm text-gray-500">{budgetGroup.currency}</span>
                                        </div>
                                        
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleCancelEdit(subcategory.id)}
                                          className="text-gray-600 hover:text-gray-800"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <BudgetItem
                                    categoryId={subcategory.id}
                                    categoryName={subcategory.name}
                                    categoryIcon={subcategory.icon}
                                    categoryColor={primaryCategory.color}
                                    budget={subBudget}
                                    spent={subSpent}
                                    remaining={subRemaining}
                                    percentage={subPercentage}
                                    isSubcategory={true}
                                    onEdit={handleEditBudget}
                                    onDelete={handleDeleteBudget}
                                    onAdd={handleAddNewBudget}
                                  />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Floating Save Button for Mobile */}
        {hasChanges && (
          <div className="fixed bottom-6 right-6 md:hidden">
            <Button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700 shadow-lg"
              size="lg"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
