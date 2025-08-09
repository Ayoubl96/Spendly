import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card } from '../ui/card'
import { DatePicker } from '../ui/date-picker'
import { CurrencySelect } from '../ui/currency-select'
import { useBudgetGroupStore } from '../../stores/budget-group.store'
import { CreateBudgetGroupRequest, UpdateBudgetGroupRequest, BudgetGroup } from '../../types/api.types'
import { useExpenseStore } from '../../stores/expense.store'


interface BudgetGroupFormProps {
  budgetGroup?: BudgetGroup
  onSuccess?: () => void
  onCancel?: () => void
}

const BudgetGroupForm: React.FC<BudgetGroupFormProps> = ({ 
  budgetGroup,
  onSuccess,
  onCancel 
}) => {
  const { createBudgetGroup, updateBudgetGroup, isLoading, error, clearError } = useBudgetGroupStore()
  const { currencies } = useExpenseStore()


  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    periodType: 'monthly' as 'monthly' | 'quarterly' | 'yearly' | 'custom',
    startDate: '',
    endDate: '',
    currency: 'EUR',
    // auto generation controls
    autoCreateBudgets: true,
    categoryScope: 'all' as 'primary' | 'subcategories' | 'all',
    defaultAmount: 0,
    includeInactiveCategories: false,
    categoryConfigs: [] as Array<{ category_id: string; amount: number }>,
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (budgetGroup) {
      setFormData((prev) => ({
        ...prev,
        name: budgetGroup.name,
        description: budgetGroup.description || '',
        periodType: budgetGroup.periodType,
        startDate: budgetGroup.startDate,
        endDate: budgetGroup.endDate,
        currency: budgetGroup.currency,
      }))
    }
  }, [budgetGroup])



  useEffect(() => {
    clearError()
    return () => clearError()
  }, [clearError])

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Budget group name is required'
    }
    
    if (!formData.startDate) {
      errors.startDate = 'Start date is required'
    }
    
    if (!formData.endDate) {
      errors.endDate = 'End date is required'
    }
    
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      if (end <= start) {
        errors.endDate = 'End date must be after start date'
      }
    }
    
    if (!formData.currency) {
      errors.currency = 'Currency is required'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      if (budgetGroup) {
        // Update existing budget group
        const updateData: UpdateBudgetGroupRequest = {
          name: formData.name,
          description: formData.description || undefined,
          periodType: formData.periodType,
          startDate: formData.startDate,
          endDate: formData.endDate,
          currency: formData.currency
        }
        await updateBudgetGroup(budgetGroup.id, updateData)
      } else {
        // Create new budget group
        const createData: CreateBudgetGroupRequest = {
          name: formData.name,
          description: formData.description || undefined,
          periodType: formData.periodType,
          startDate: formData.startDate,
          endDate: formData.endDate,
          currency: formData.currency,
          auto_create_budgets: formData.autoCreateBudgets,
          category_scope: formData.categoryScope,
          default_amount: formData.defaultAmount,
          include_inactive_categories: formData.includeInactiveCategories,
          category_configs: formData.categoryConfigs,
        }
        await createBudgetGroup(createData)
      }
      
      onSuccess?.()
    } catch (error) {
      // Error is handled by the store
      console.error('Failed to save budget group:', error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const generateEndDateSuggestion = (startDate: string, periodType: string) => {
    if (!startDate) return ''
    
    const start = new Date(startDate)
    let end = new Date(start)
    
    switch (periodType) {
      case 'monthly':
        end.setMonth(end.getMonth() + 1)
        end.setDate(end.getDate() - 1)
        break
      case 'quarterly':
        end.setMonth(end.getMonth() + 3)
        end.setDate(end.getDate() - 1)
        break
      case 'yearly':
        end.setFullYear(end.getFullYear() + 1)
        end.setDate(end.getDate() - 1)
        break
      default:
        return ''
    }
    
    return end.toISOString().split('T')[0]
  }

  // Auto-generate end date when start date or period type changes
  useEffect(() => {
    if (formData.startDate && formData.periodType !== 'custom' && !budgetGroup) {
      const suggestedEndDate = generateEndDateSuggestion(formData.startDate, formData.periodType)
      if (suggestedEndDate) {
        setFormData(prev => ({ ...prev, endDate: suggestedEndDate }))
      }
    }
  }, [formData.startDate, formData.periodType, budgetGroup])

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {budgetGroup ? 'Edit Budget Group' : 'Create Budget Group'}
          </h2>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Budget Group Name *
            </label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., August 2024 Budget"
              className={validationErrors.name ? 'border-red-500' : ''}
            />
            {validationErrors.name && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Input
              id="description"
              type="text"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Optional description for this budget group"
            />
          </div>

          <div>
            <label htmlFor="periodType" className="block text-sm font-medium text-gray-700 mb-2">
              Period Type *
            </label>
            <select
              id="periodType"
              value={formData.periodType}
              onChange={(e) => handleInputChange('periodType', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
              Currency *
            </label>
            <CurrencySelect
              currencies={currencies || []}
              value={formData.currency}
              onValueChange={(value) => handleInputChange('currency', value || '')}
              className={validationErrors.currency ? 'border-red-500' : ''}
            />
            {validationErrors.currency && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.currency}</p>
            )}
          </div>

          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date *
            </label>
            <DatePicker
              date={formData.startDate ? new Date(formData.startDate) : undefined}
              onDateChange={(date) => 
                handleInputChange('startDate', date ? date.toISOString().split('T')[0] : '')
              }
              className={validationErrors.startDate ? 'border-red-500' : ''}
            />
            {validationErrors.startDate && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.startDate}</p>
            )}
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
              End Date *
            </label>
            <DatePicker
              date={formData.endDate ? new Date(formData.endDate) : undefined}
              onDateChange={(date) => 
                handleInputChange('endDate', date ? date.toISOString().split('T')[0] : '')
              }
              className={validationErrors.endDate ? 'border-red-500' : ''}
            />
            {validationErrors.endDate && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.endDate}</p>
            )}
          </div>
        </div>

        {/* Auto-generate budgets section - Only for new budget groups */}
        {!budgetGroup && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">Auto-create budgets for categories</div>
                <div className="text-xs text-gray-500">Create a budget for each category in this group to edit quickly</div>
              </div>
              <label className="inline-flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.autoCreateBudgets}
                  onChange={(e) => setFormData(prev => ({ ...prev, autoCreateBudgets: e.target.checked }))}
                />
                <span className="text-sm">Enable</span>
              </label>
            </div>

            {formData.autoCreateBudgets && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category scope</label>
                    <select
                      value={formData.categoryScope}
                      onChange={(e) => handleInputChange('categoryScope', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="all">All (primary + subcategories)</option>
                      <option value="primary">Primary categories only</option>
                      <option value="subcategories">Subcategories only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Default amount</label>
                    <Input
                      type="number"
                      value={formData.defaultAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, defaultAmount: Number(e.target.value || 0) }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="inline-flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.includeInactiveCategories}
                        onChange={(e) => setFormData(prev => ({ ...prev, includeInactiveCategories: e.target.checked }))}
                      />
                      <span className="text-sm">Include inactive categories</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message for editing existing budget groups */}
        {budgetGroup && (
          <div className="border-t pt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start space-x-3">
                <div className="text-blue-600 mt-0.5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-blue-800">Managing budgets for this group</div>
                  <div className="text-sm text-blue-700 mt-1">
                    After saving these changes, you can manage individual category budgets using the budget editor below. You can add, edit, or remove budgets for specific categories there.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? 'Saving...' : budgetGroup ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default BudgetGroupForm
