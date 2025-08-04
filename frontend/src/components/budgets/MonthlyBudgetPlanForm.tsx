import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { CurrencySelect } from '../ui/currency-select'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { CategoryTree, Currency } from '../../types/api.types'
import { CreateMonthlyBudgetPlanRequest, BudgetPlanFormData } from '../../types/budget-plan.types'
import { useBudgetPlanStore } from '../../stores/budget-plan.store'
import { X, AlertCircle, PlusCircle, Calendar, DollarSign, Settings } from 'lucide-react'
import { CurrencyAmountDisplay } from '../ui/currency-amount-display'

interface MonthlyBudgetPlanFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (planData: CreateMonthlyBudgetPlanRequest) => Promise<void>
  categoryTree?: CategoryTree[]
  currencies?: Currency[]
  isLoading?: boolean
  editingPlan?: any | null // TODO: Type this properly
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
]

const YEARS = Array.from({ length: 11 }, (_, index) => 2020 + index)

export function MonthlyBudgetPlanForm({
  isOpen,
  onClose,
  onSubmit,
  categoryTree = [],
  currencies = [],
  isLoading = false,
  editingPlan
}: MonthlyBudgetPlanFormProps) {
  const { currentPlan } = useBudgetPlanStore()
  const [formData, setFormData] = useState<BudgetPlanFormData>({
    name: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    currency: 'EUR',
    bulkSettings: {
      alertThreshold: '80',
      isActive: true
    },
    categoryAllocations: {}
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Get primary categories (top-level categories without parent)
  const getPrimaryCategories = (categories: CategoryTree[]): CategoryTree[] => {
    return categories.filter(cat => !cat.parentId)
  }

  const primaryCategories = getPrimaryCategories(categoryTree)

  // Initialize form data
  useEffect(() => {
    if (isOpen) {
      if (editingPlan && currentPlan) {
        console.log('🔍 Pre-filling form with detailed plan data:', currentPlan)
        
        // Build category allocations from the detailed plan data
        const categoryAllocations: Record<string, { amount: string; alertThreshold?: string; isActive?: boolean }> = {}
        
        if (currentPlan.categoryBudgets) {
          currentPlan.categoryBudgets.forEach((allocation) => {
            categoryAllocations[allocation.category_id] = {
              amount: allocation.budget_amount.toString(),
              alertThreshold: allocation.alert_threshold.toString(),
              isActive: allocation.is_active
            }
          })
        }
        
        setFormData({
          name: currentPlan.name || editingPlan.name,
          month: currentPlan.month || editingPlan.month,
          year: currentPlan.year || editingPlan.year,
          currency: currentPlan.currency || editingPlan.currency,
          bulkSettings: {
            alertThreshold: '80', // Use default, individual categories can override
            isActive: true
          },
          categoryAllocations
        })
        
        console.log('✅ Form pre-filled with category allocations:', categoryAllocations)
      } else {
        // Reset form for new plan
        setFormData({
          name: '',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          currency: 'EUR',
          bulkSettings: {
            alertThreshold: '80',
            isActive: true
          },
          categoryAllocations: {}
        })
      }
    }
    setErrors({})
  }, [editingPlan, currentPlan, isOpen])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Plan name is required'
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Plan name must be at least 3 characters'
    }

    // Check that at least one category has a budget allocation
    const hasAllocations = Object.values(formData.categoryAllocations).some(
      allocation => parseFloat(allocation.amount) > 0
    )
    if (!hasAllocations) {
      newErrors.categories = 'At least one category must have a budget amount'
    }

    // Validate individual category allocations
    Object.entries(formData.categoryAllocations).forEach(([categoryId, allocation]) => {
      const amount = parseFloat(allocation.amount)
      const threshold = parseFloat(allocation.alertThreshold || '0')

      if (allocation.amount && (isNaN(amount) || amount < 0)) {
        newErrors[`amount_${categoryId}`] = 'Amount must be 0 or greater'
      }

      if (allocation.alertThreshold && (isNaN(threshold) || threshold <= 0 || threshold > 100)) {
        newErrors[`threshold_${categoryId}`] = 'Alert threshold must be between 1 and 100'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      const categoryBudgets = Object.entries(formData.categoryAllocations)
        .filter(([_, allocation]) => parseFloat(allocation.amount) >= 0 && allocation.amount !== '')
        .map(([categoryId, allocation]) => ({
          category_id: categoryId,
          budget_amount: parseFloat(allocation.amount),
          alert_threshold: parseFloat(allocation.alertThreshold || formData.bulkSettings.alertThreshold) || 80,
          is_active: allocation.isActive !== undefined ? allocation.isActive : formData.bulkSettings.isActive
        }))

      const submitData: CreateMonthlyBudgetPlanRequest = {
        name: formData.name.trim(),
        month: formData.month,
        year: formData.year,
        currency: formData.currency,
        category_budgets: categoryBudgets
      }

      await onSubmit(submitData)
      onClose()
    } catch (error) {
      console.error('Failed to submit budget plan:', error)
    }
  }

  const handleCategoryAllocationChange = (
    categoryId: string,
    field: 'amount' | 'alertThreshold' | 'isActive',
    value: string | boolean
  ) => {
    setFormData(prev => ({
      ...prev,
      categoryAllocations: {
        ...prev.categoryAllocations,
        [categoryId]: {
          amount: prev.categoryAllocations[categoryId]?.amount || '',
          alertThreshold: prev.categoryAllocations[categoryId]?.alertThreshold,
          isActive: prev.categoryAllocations[categoryId]?.isActive,
          [field]: value
        }
      }
    }))

    // Clear errors for this field
    const errorKey = field === 'amount' ? `amount_${categoryId}` : `threshold_${categoryId}`
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }))
    }
  }

  const handleBulkSettingsChange = (field: 'alertThreshold' | 'isActive', value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      bulkSettings: {
        ...prev.bulkSettings,
        [field]: value
      }
    }))
  }

  const calculateTotalAmount = (): number => {
    return Object.values(formData.categoryAllocations).reduce((total, allocation) => {
      const amount = parseFloat(allocation.amount) || 0
      return total + amount
    }, 0)
  }

  const getCategoryAllocation = (categoryId: string) => {
    return formData.categoryAllocations[categoryId] || {
      amount: '',
      alertThreshold: undefined,
      isActive: undefined
    }
  }

  const getEffectiveAlertThreshold = (categoryId: string) => {
    const allocation = getCategoryAllocation(categoryId)
    return allocation.alertThreshold || formData.bulkSettings.alertThreshold
  }

  const getEffectiveIsActive = (categoryId: string) => {
    const allocation = getCategoryAllocation(categoryId)
    return allocation.isActive !== undefined ? allocation.isActive : formData.bulkSettings.isActive
  }

  if (!isOpen) return null

  const totalAmount = calculateTotalAmount()
  const selectedMonth = MONTHS.find(m => m.value === formData.month)?.label || ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {editingPlan ? 'Edit Monthly Budget Plan' : 'Create Monthly Budget Plan'}
            </CardTitle>
            <CardDescription>
              Set budget amounts for multiple categories in {selectedMonth} {formData.year}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <CardContent className="flex-1 overflow-y-auto space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Plan Name *
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g., March 2025 Budget"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.name}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="month" className="block text-sm font-medium mb-1">
                  Month *
                </label>
                <select
                  id="month"
                  name="month"
                  value={formData.month}
                  onChange={(e) => setFormData(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MONTHS.map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="year" className="block text-sm font-medium mb-1">
                  Year *
                </label>
                <select
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {YEARS.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <CurrencySelect
                  currencies={currencies}
                  value={formData.currency}
                  onValueChange={(currency: string | undefined) => setFormData(prev => ({ ...prev, currency: currency || 'EUR' }))}
                  label="Currency *"
                />
              </div>
            </div>

            {/* Total Summary */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Total Monthly Budget</span>
                  </div>
                  <div className="text-xl font-bold text-blue-900">
                    <CurrencyAmountDisplay
                      amount={totalAmount}
                      currency={formData.currency}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Settings */}
            <Card className="bg-orange-50 border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4 text-orange-600" />
                  Bulk Settings
                </CardTitle>
                <CardDescription>
                  These settings will apply to all categories by default
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Default Alert Threshold (%)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="80"
                      value={formData.bulkSettings.alertThreshold}
                      onChange={(e) => handleBulkSettingsChange('alertThreshold', e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Alert when budget usage reaches this percentage
                    </p>
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={formData.bulkSettings.isActive}
                        onChange={(e) => handleBulkSettingsChange('isActive', e.target.checked)}
                        className="rounded"
                      />
                      All budgets active by default
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Budget Allocations */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Category Budget Allocations</h3>
                <p className="text-sm text-gray-500">
                  Set amounts for primary categories and their subcategories
                </p>
              </div>

              {errors.categories && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  {errors.categories}
                </div>
              )}

              <Accordion type="multiple" className="space-y-2">
                {primaryCategories.map(primaryCategory => {
                  const primaryAllocation = getCategoryAllocation(primaryCategory.id)
                  const hasSubcategories = primaryCategory.subcategories && primaryCategory.subcategories.length > 0

                  return (
                    <AccordionItem key={primaryCategory.id} value={primaryCategory.id} className="border rounded-lg">
                      <Card className="border-0">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center justify-between w-full mr-4">
                            <div className="flex items-center gap-3">
                              <div className="text-left">
                                <h4 className="font-medium text-sm">{primaryCategory.name}</h4>
                                <p className="text-xs text-gray-500">
                                  {primaryCategory.expenseCount} expenses • 
                                  <CurrencyAmountDisplay
                                    amount={primaryCategory.totalAmount}
                                    currency={formData.currency}
                                    className="text-xs ml-1"
                                  />
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={primaryAllocation.amount}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    handleCategoryAllocationChange(
                                      primaryCategory.id,
                                      'amount',
                                      e.target.value
                                    )
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`w-24 text-sm ${errors[`amount_${primaryCategory.id}`] ? 'border-red-500' : ''}`}
                                />
                                {errors[`amount_${primaryCategory.id}`] && (
                                  <p className="text-xs text-red-600 mt-1">
                                    {errors[`amount_${primaryCategory.id}`]}
                                  </p>
                                )}
                              </div>
                              
                              {hasSubcategories && (
                                <span className="text-xs text-gray-400">
                                  {primaryCategory.subcategories.length} subcategories
                                </span>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        
                        {hasSubcategories && (
                          <AccordionContent className="px-4 pb-4">
                            <div className="space-y-3 ml-4 border-l-2 border-gray-100 pl-4">
                              {primaryCategory.subcategories.map(subcategory => {
                                const subAllocation = getCategoryAllocation(subcategory.id)
                                
                                return (
                                  <div key={subcategory.id} className="flex items-center justify-between py-2 bg-gray-50 rounded px-3">
                                    <div className="flex-1">
                                      <h5 className="font-medium text-sm">{subcategory.name}</h5>
                                      <p className="text-xs text-gray-500">
                                        {subcategory.expenseCount} expenses • 
                                        <CurrencyAmountDisplay
                                          amount={subcategory.totalAmount}
                                          currency={formData.currency}
                                          className="text-xs ml-1"
                                        />
                                      </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={subAllocation.amount}
                                        onChange={(e) => handleCategoryAllocationChange(
                                          subcategory.id,
                                          'amount',
                                          e.target.value
                                        )}
                                        className={`w-24 text-sm ${errors[`amount_${subcategory.id}`] ? 'border-red-500' : ''}`}
                                      />
                                      {errors[`amount_${subcategory.id}`] && (
                                        <p className="text-xs text-red-600 mt-1">
                                          {errors[`amount_${subcategory.id}`]}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </AccordionContent>
                        )}
                      </Card>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </div>
          </CardContent>

          {/* Footer with Actions */}
          <div className="border-t p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Total Budget: <CurrencyAmountDisplay amount={totalAmount} currency={formData.currency} className="font-medium" />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : (editingPlan ? 'Update Plan' : 'Create Plan')}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Card>
    </div>
  )
}