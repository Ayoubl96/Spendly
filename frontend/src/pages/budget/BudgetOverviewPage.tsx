import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBudgetGroupStore } from '../../stores/budget-group.store'
import { useExpenseStore } from '../../stores/expense.store'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import BudgetGroupCard from '../../components/budgets/BudgetGroupCard'
import BudgetGroupForm from '../../components/budgets/BudgetGroupForm'
import { 
  PlusCircle, 
  Calendar, 
  Target, 
  ArrowLeft,
  Settings
} from 'lucide-react'

type ViewMode = 'overview' | 'create-group' | 'edit-group'

export function BudgetOverviewPage() {
  const navigate = useNavigate()
  
  // Budget Groups Store
  const {
    budgetGroups,
    budgetGroupsSummary,
    isLoading: isGroupsLoading,
    error: groupsError,
    fetchBudgetGroups,
    fetchCurrentBudgetGroups,
    fetchBudgetGroupsSummary,
    deleteBudgetGroup,
    clearError: clearGroupsError
  } = useBudgetGroupStore()

  const {
    fetchCategories,
    fetchCategoryTree,
    fetchCurrencies
  } = useExpenseStore()

  // Local State
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [selectedBudgetGroup, setSelectedBudgetGroup] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('current')

  // Initialize data
  useEffect(() => {
    fetchBudgetGroups()
    fetchCurrentBudgetGroups()
    fetchBudgetGroupsSummary()
    fetchCategories()
    fetchCategoryTree()
    fetchCurrencies()
  }, [
    fetchBudgetGroups,
    fetchCurrentBudgetGroups,
    fetchBudgetGroupsSummary,
    fetchCategories,
    fetchCategoryTree,
    fetchCurrencies
  ])

  // Clear errors on mount
  useEffect(() => {
    clearGroupsError()
  }, [clearGroupsError])

  // Handle back navigation
  const handleBack = () => {
    setViewMode('overview')
    setSelectedBudgetGroup(null)
  }

  // Handle successful form submissions
  const handleGroupFormSuccess = () => {
    setViewMode('overview')
    setSelectedBudgetGroup(null)
    fetchBudgetGroups()
    fetchBudgetGroupsSummary()
  }

  // Handle delete operations
  const handleDeleteBudgetGroup = async (budgetGroup: any) => {
    if (window.confirm(`Are you sure you want to delete "${budgetGroup.name}"?`)) {
      try {
        await deleteBudgetGroup(budgetGroup.id)
      } catch (error) {
        console.error('Failed to delete budget group:', error)
      }
    }
  }

  // Get current period budget groups
  const currentPeriodGroups = budgetGroups.filter(bg => {
    const today = new Date()
    const startDate = new Date(bg.startDate)
    const endDate = new Date(bg.endDate)
    return bg.isActive && startDate <= today && today <= endDate
  })

  // Get all active budget groups
  const activeBudgetGroups = budgetGroups.filter(bg => bg.isActive)

  // Render functions for different view modes
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Management</h1>
          <p className="text-gray-600">Manage your budget groups and track spending</p>
        </div>
        <Button onClick={() => setViewMode('create-group')}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Create Budget Group
        </Button>
      </div>

      {/* Error Display */}
      {groupsError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="text-red-700">{groupsError}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {budgetGroupsSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Current Period</p>
                  <p className="text-2xl font-bold">{budgetGroupsSummary.current_period_groups}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Groups</p>
                  <p className="text-2xl font-bold">{budgetGroupsSummary.active_groups}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Settings className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Budget</p>
                  <p className="text-2xl font-bold">
                    {budgetGroupsSummary.total_budgeted?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="current">Current ({currentPeriodGroups.length})</TabsTrigger>
          <TabsTrigger value="all">All ({activeBudgetGroups.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
          {currentPeriodGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentPeriodGroups.map((group) => (
                <BudgetGroupCard
                  key={group.id}
                  budgetGroup={group}
                  onClick={() => navigate(`/budget/manage/${group.id}`)}
                  onEdit={() => {
                    setSelectedBudgetGroup(group)
                    setViewMode('edit-group')
                  }}
                  onDelete={() => handleDeleteBudgetGroup(group)}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8">
              <div className="text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No current budget groups</h3>
                <p className="text-gray-500 mb-4">Create a budget group for the current period to get started.</p>
                <Button onClick={() => setViewMode('create-group')}>
                  Create Budget Group
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-6">
          {activeBudgetGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeBudgetGroups.map((group) => (
                <BudgetGroupCard
                  key={group.id}
                  budgetGroup={group}
                  onClick={() => navigate(`/budget/manage/${group.id}`)}
                  onEdit={() => {
                    setSelectedBudgetGroup(group)
                    setViewMode('edit-group')
                  }}
                  onDelete={() => handleDeleteBudgetGroup(group)}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8">
              <div className="text-center">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No budget groups yet</h3>
                <p className="text-gray-500 mb-4">Create your first budget group to organize your budgets.</p>
                <Button onClick={() => setViewMode('create-group')}>
                  Create First Budget Group
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )

  // Main render logic based on view mode
  const renderContent = () => {
    switch (viewMode) {
      case 'create-group':
        return (
          <div className="space-y-6">
            <div className="flex items-center">
              <Button variant="ghost" onClick={handleBack} className="mr-4">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Create Budget Group</h1>
            </div>
            <BudgetGroupForm
              onSuccess={handleGroupFormSuccess}
              onCancel={handleBack}
            />
          </div>
        )

      case 'edit-group':
        return (
          <div className="space-y-6">
            <div className="flex items-center">
              <Button variant="ghost" onClick={handleBack} className="mr-4">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Edit Budget Group</h1>
            </div>
            <BudgetGroupForm
              budgetGroup={selectedBudgetGroup || undefined}
              onSuccess={handleGroupFormSuccess}
              onCancel={handleBack}
            />
          </div>
        )

      default:
        return renderOverview()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {renderContent()}
      </div>
    </div>
  )
}
