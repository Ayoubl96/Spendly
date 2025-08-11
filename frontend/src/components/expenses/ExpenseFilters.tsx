import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { DateRangePicker } from '../ui/date-picker'

import { CategorySubcategorySelect } from '../ui/category-select'
import { CurrencySelect } from '../ui/currency-select'
import { PaymentMethodFilter } from '../ui/payment-method-filter'
import { ExpenseFilters as ExpenseFiltersType } from '../../types/api.types'
import { useExpenseStore } from '../../stores/expense.store'
import { Search, Filter, X, TrendingUp, DollarSign, Tag } from 'lucide-react'
import { format } from 'date-fns'

// Component for editing tag filters
interface TagFilterEditorProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

const TagFilterEditor: React.FC<TagFilterEditorProps> = ({ tags, onTagsChange }) => {
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onTagsChange([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Add tag to filter..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            className="pl-10 h-9 text-sm"
          />
        </div>
        <Button
          onClick={handleAddTag}
          disabled={!newTag.trim() || tags.includes(newTag.trim())}
          size="sm"
          className="h-9"
        >
          Add
        </Button>
      </div>
      
      {/* Display current filter tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
            >
              <Tag className="w-3 h-3 mr-1" />
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 hover:bg-blue-300 text-blue-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

interface ExpenseFiltersProps {
  onFiltersChange?: (filters: ExpenseFiltersType) => void
}

export function ExpenseFilters({ onFiltersChange }: ExpenseFiltersProps) {
  const { 
    filters, 
    setFilters, 
    clearFilters, 
    categoryTree, 
    fetchCategoryTree,
    currencies,
    fetchCurrencies,
    expenses,
    totalAmount 
  } = useExpenseStore()

  const [localFilters, setLocalFilters] = useState<ExpenseFiltersType>(filters)

  useEffect(() => {
    fetchCategoryTree()
    fetchCurrencies()
  }, [fetchCategoryTree, fetchCurrencies])

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleFilterChange = (key: keyof ExpenseFiltersType, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
  }

  const applyFilters = () => {
    setFilters(localFilters)
    onFiltersChange?.(localFilters)
  }

  const resetFilters = () => {
    setLocalFilters({})
    clearFilters()
    onFiltersChange?.({})
  }

  const setDateRange = (range: 'today' | 'week' | 'month' | 'year' | 'lastMonth' | 'lastYear') => {
    const now = new Date()
    let startDate: string, endDate: string

    // Helper function to format date as yyyy-MM-dd in local timezone
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Helper function to get start of month
    const getStartOfMonth = (date: Date) => {
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
      // Ensure we're getting the exact start of the day in local timezone
      startOfMonth.setHours(0, 0, 0, 0)
      return startOfMonth
    }

    // Helper function to get end of month
    const getEndOfMonth = (date: Date) => {
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      // Ensure we're getting the exact end of the day in local timezone
      endOfMonth.setHours(23, 59, 59, 999)
      return endOfMonth
    }

    switch (range) {
      case 'today':
        const today = new Date(now)
        today.setHours(0, 0, 0, 0)
        startDate = endDate = formatDate(today)
        break
      case 'week':
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        const endOfDay = new Date(now)
        endOfDay.setHours(23, 59, 59, 999)
        startDate = formatDate(startOfWeek)
        endDate = formatDate(endOfDay)
        break
      case 'month':
        const monthStart = getStartOfMonth(now)
        const monthEnd = getEndOfMonth(now)
        startDate = formatDate(monthStart)
        endDate = formatDate(monthEnd)
        break
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1)
        yearStart.setHours(0, 0, 0, 0)
        const yearEnd = new Date(now.getFullYear(), 11, 31)
        yearEnd.setHours(23, 59, 59, 999)
        startDate = formatDate(yearStart)
        endDate = formatDate(yearEnd)
        break
      case 'lastMonth':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        startDate = formatDate(getStartOfMonth(lastMonth))
        endDate = formatDate(getEndOfMonth(lastMonth))
        break
      case 'lastYear':
        const lastYear = now.getFullYear() - 1
        const lastYearStart = new Date(lastYear, 0, 1)
        lastYearStart.setHours(0, 0, 0, 0)
        const lastYearEnd = new Date(lastYear, 11, 31)
        lastYearEnd.setHours(23, 59, 59, 999)
        startDate = formatDate(lastYearStart)
        endDate = formatDate(lastYearEnd)
        break
    }

    setLocalFilters({
      ...localFilters,
      startDate,
      endDate
    })
  }

  const hasActiveFilters = Object.keys(localFilters).some(key => 
    localFilters[key as keyof ExpenseFiltersType] !== undefined && 
    localFilters[key as keyof ExpenseFiltersType] !== ''
  )

  // Calculate quick stats
  const totalExpenses = expenses.length
  const activeFiltersCount = Object.values(localFilters).filter(value => 
    value !== undefined && value !== '' && value !== null
  ).length

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      {/* Header with Key Metrics */}
      <div className="px-6 py-4 border-b bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h2>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold text-gray-900">{totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-gray-600">Expenses:</span>
                <span className="font-semibold text-gray-900">{totalExpenses}</span>
              </div>
              {activeFiltersCount > 0 && (
                <div className="flex items-center space-x-1">
                  <Filter className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-600 font-medium">{activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Filter Controls */}
      <div className="p-6 space-y-4">
        {/* Primary Controls Row */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-end">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search expenses..."
                value={localFilters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Date Range</label>
            <DateRangePicker
              startDate={localFilters.startDate ? new Date(localFilters.startDate) : undefined}
              endDate={localFilters.endDate ? new Date(localFilters.endDate) : undefined}
              onStartDateChange={(date) => handleFilterChange('startDate', date ? format(date, 'yyyy-MM-dd') : undefined)}
              onEndDateChange={(date) => handleFilterChange('endDate', date ? format(date, 'yyyy-MM-dd') : undefined)}
              startPlaceholder="Start date"
              endPlaceholder="End date"
              className="h-9"
            />
          </div>

          {/* Currency */}
          <div className="lg:col-span-1">
            <CurrencySelect
              currencies={currencies}
              value={localFilters.currency}
              onValueChange={(value) => handleFilterChange('currency', value)}
              label="Currency"
              placeholder="All Currencies"
              showClearButton={true}
              height="h-9"
              className="min-w-[120px]"
            />
          </div>

          {/* Action Button */}
          <div className="lg:col-span-1">
            <Button 
              onClick={applyFilters} 
              size="sm" 
              className="w-full h-9 bg-blue-600 hover:bg-blue-700"
            >
              Apply
            </Button>
          </div>
        </div>

        {/* Secondary Row for Categories */}
        <CategorySubcategorySelect
          categoryTree={categoryTree}
          selectedCategoryId={localFilters.categoryId}
          selectedSubcategoryId={localFilters.subcategoryId}
          onCategoryChange={(categoryId) => {
            handleFilterChange('categoryId', categoryId)
            // Clear subcategory when primary category changes
            if (localFilters.subcategoryId) {
              handleFilterChange('subcategoryId', undefined)
            }
          }}
          onSubcategoryChange={(subcategoryId) => handleFilterChange('subcategoryId', subcategoryId)}
          categoryLabel="Primary Category"
          subcategoryLabel="Subcategory"
          categoryPlaceholder="All Primary Categories"
          subcategoryPlaceholder="All Subcategories"
          showClearButtons={true}
          height="h-9"
        />

        {/* Quick Date Filters */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-gray-700">Quick select:</span>
          <div className="flex items-center space-x-2">
            {[
              { label: 'Today', value: 'today' },
              { label: 'This Week', value: 'week' },
              { label: 'This Month', value: 'month' },
              { label: 'Last Month', value: 'lastMonth' },
              { label: 'This Year', value: 'year' },
            ].map((period) => (
              <Button
                key={period.value}
                variant="outline"
                size="sm"
                onClick={() => setDateRange(period.value as any)}
                className="h-7 px-3 text-xs border-gray-300 hover:border-blue-500 hover:text-blue-600"
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Tags Filter */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700">Filter by Tags</label>
          <TagFilterEditor 
            tags={localFilters.tags || []}
            onTagsChange={(tags) => handleFilterChange('tags', tags)}
          />
        </div>

        {/* Secondary Controls Row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 pt-2 border-t">
          {/* Payment Method */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
            <div className="flex gap-1">
              <PaymentMethodFilter
                value={localFilters.paymentMethod}
                onChange={(value) => handleFilterChange('paymentMethod', value)}
              />
              {localFilters.paymentMethod && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFilterChange('paymentMethod', undefined)}
                  className="h-9 px-2 shrink-0 hover:bg-red-50 hover:text-red-600 border border-gray-300"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Min Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Min Amount</label>
            <Input
              type="number"
              placeholder="0.00"
              value={localFilters.minAmount || ''}
              onChange={(e) => handleFilterChange('minAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="h-9 text-sm"
            />
          </div>

          {/* Max Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Max Amount</label>
            <Input
              type="number"
              placeholder="1000.00"
              value={localFilters.maxAmount || ''}
              onChange={(e) => handleFilterChange('maxAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="h-9 text-sm"
            />
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            {hasActiveFilters && (
              <Button 
                onClick={resetFilters} 
                variant="outline" 
                size="sm"
                className="h-9 w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}