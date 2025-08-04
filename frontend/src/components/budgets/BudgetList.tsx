import React, { useState } from 'react'
import { Budget, BudgetPerformance } from '../../types/api.types'
import { BudgetCard } from './BudgetCard'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { 
  PlusCircle, 
  Search, 
  Filter, 
  PiggyBank,
  SortAsc,
  SortDesc,
  Grid,
  List
} from 'lucide-react'

interface BudgetListProps {
  budgets: Budget[]
  budgetPerformances: Record<string, BudgetPerformance>
  onCreateBudget?: () => void
  onEditBudget?: (budget: Budget) => void
  onDeleteBudget?: (budget: Budget) => void
  onLoadPerformance?: (budgetId: string) => void
  isLoading?: boolean
}

type SortField = 'name' | 'amount' | 'startDate' | 'status' | 'percentageUsed'
type SortOrder = 'asc' | 'desc'
type ViewMode = 'grid' | 'list'

export function BudgetList({
  budgets,
  budgetPerformances,
  onCreateBudget,
  onEditBudget,
  onDeleteBudget,
  onLoadPerformance,
  isLoading = false
}: BudgetListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [periodFilter, setPeriodFilter] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('startDate')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Filter budgets based on search and filters
  const filteredBudgets = budgets.filter(budget => {
    const matchesSearch = budget.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
      (budgetPerformances[budget.id]?.status === statusFilter)
    
    const matchesPeriod = periodFilter === 'all' || budget.periodType === periodFilter
    
    const matchesActive = activeFilter === 'all' || 
      (activeFilter === 'active' ? budget.is_active : !budget.is_active)
    
    return matchesSearch && matchesStatus && matchesPeriod && matchesActive
  })

  // Sort budgets
  const sortedBudgets = [...filteredBudgets].sort((a, b) => {
    let aValue: any
    let bValue: any
    
    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'amount':
        aValue = a.amount
        bValue = b.amount
        break
      case 'startDate':
        aValue = new Date(a.startDate)
        bValue = new Date(b.startDate)
        break
      case 'status':
        aValue = budgetPerformances[a.id]?.status || 'unknown'
        bValue = budgetPerformances[b.id]?.status || 'unknown'
        break
      case 'percentageUsed':
        aValue = budgetPerformances[a.id]?.percentageUsed || 0
        bValue = budgetPerformances[b.id]?.percentageUsed || 0
        break
      default:
        return 0
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
  }

  if (budgets.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <PiggyBank className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No budgets yet</h3>
        <p className="text-gray-500 mb-6">
          Create your first budget to start tracking your spending limits.
        </p>
        {onCreateBudget && (
          <Button onClick={onCreateBudget} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Create Your First Budget
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Budgets</h2>
          <p className="text-gray-600">
            {budgets.length} {budgets.length === 1 ? 'budget' : 'budgets'} total
          </p>
        </div>
        {onCreateBudget && (
          <Button onClick={onCreateBudget} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Create Budget
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search budgets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="on_track">On Track</option>
            <option value="warning">Warning</option>
            <option value="over_budget">Over Budget</option>
          </select>

          {/* Period Filter */}
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Periods</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom</option>
          </select>

          {/* Active Filter */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Budgets</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 p-0"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700">Sort by:</span>
          <div className="flex items-center gap-1">
            {[
              { field: 'name' as SortField, label: 'Name' },
              { field: 'amount' as SortField, label: 'Amount' },
              { field: 'startDate' as SortField, label: 'Date' },
              { field: 'status' as SortField, label: 'Status' },
              { field: 'percentageUsed' as SortField, label: 'Progress' },
            ].map(({ field, label }) => (
              <Button
                key={field}
                variant={sortField === field ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleSort(field)}
                className="gap-1"
              >
                {label}
                {getSortIcon(field)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Budget Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-600">Loading budgets...</span>
        </div>
      ) : sortedBudgets.length === 0 ? (
        <div className="text-center py-8">
          <Filter className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No budgets match your filters</h3>
          <p className="text-gray-500">Try adjusting your search criteria or filters.</p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('')
              setStatusFilter('all')
              setPeriodFilter('all')
              setActiveFilter('all')
            }}
            className="mt-4"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }>
          {sortedBudgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              performance={budgetPerformances[budget.id]}
              onEdit={onEditBudget}
              onDelete={onDeleteBudget}
              onLoadPerformance={onLoadPerformance}
            />
          ))}
        </div>
      )}

      {/* Results Summary */}
      {sortedBudgets.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Showing {sortedBudgets.length} of {budgets.length} budgets
        </div>
      )}
    </div>
  )
}