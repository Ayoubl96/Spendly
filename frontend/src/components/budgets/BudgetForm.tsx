import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { DatePicker } from '../ui/date-picker'
import { CategorySubcategorySelect } from '../ui/category-select'
import { CurrencySelect } from '../ui/currency-select'
import { FormSelect } from '../ui/form-select'
import { Budget, CategoryTree, Currency } from '../../types/api.types'
import { CreateBudgetRequest, UpdateBudgetRequest } from '../../stores/budget.store'
import { X, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

// Helper function to map backend budget data to frontend form data
const mapBudgetToFormData = (budget: Budget | any) => {
  console.log('🔍 DEBUGGING: Mapping budget data:', budget)
  console.log('🔍 DEBUGGING: Budget type:', typeof budget)
  console.log('🔍 DEBUGGING: Budget keys:', Object.keys(budget || {}))
  
  if (!budget) {
    console.log('⚠️ WARNING: No budget data provided to mapBudgetToFormData')
    return {
      name: '',
      amount: '',
      currency: 'EUR',
      periodType: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      categoryId: '',
      subcategoryId: '',
      alertThreshold: '80',
      isActive: true
    }
  }
  
  const formatDate = (dateValue: any) => {
    if (!dateValue) return ''
    try {
      // Handle different date formats
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) return ''
      return date.toISOString().split('T')[0]
    } catch (error) {
      console.error('Date parsing error:', error)
      return ''
    }
  }

  const mapped = {
    name: budget.name || '',
    amount: budget.amount?.toString() || '',
    currency: budget.currency || 'EUR',
    periodType: budget.periodType || 'monthly',
    startDate: formatDate(budget.startDate) || new Date().toISOString().split('T')[0],
    endDate: formatDate(budget.endDate) || '',
    categoryId: budget.categoryId || '',
    subcategoryId: budget.subcategoryId || '',
    alertThreshold: budget.alertThreshold?.toString() || '80',
    isActive: budget.is_active !== undefined ? budget.is_active : true
  }
  
  console.log('✅ SUCCESS: Mapped form data:', mapped)
  return mapped
}

interface BudgetFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (budget: CreateBudgetRequest | UpdateBudgetRequest) => Promise<void>
  editingBudget?: Budget | null
  categoryTree?: CategoryTree[]
  currencies?: Currency[]
  isLoading?: boolean
}

const periodTypeOptions = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom Period' },
]

export function BudgetForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingBudget,
  categoryTree = [],
  currencies = [],
  isLoading = false 
}: BudgetFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    currency: 'EUR',
    periodType: 'monthly' as 'weekly' | 'monthly' | 'yearly' | 'custom',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    categoryId: '',
    subcategoryId: '',
    alertThreshold: '80',
    isActive: true
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})



  // Reset form when dialog opens/closes or when editing budget changes
  useEffect(() => {
    console.log('BudgetForm useEffect triggered:', { isOpen, editingBudget })
    if (isOpen) {
      if (editingBudget) {
        console.log('BudgetForm: Pre-filling form with editing budget:', editingBudget)
        console.log('BudgetForm: Budget fields:', {
          name: editingBudget.name,
          amount: editingBudget.amount,
          currency: editingBudget.currency,
          periodType: editingBudget.periodType,
          startDate: editingBudget.startDate,
          endDate: editingBudget.endDate,
          categoryId: editingBudget.categoryId,
          subcategoryId: editingBudget.subcategoryId,
          alertThreshold: editingBudget.alertThreshold,
          isActive: editingBudget.is_active
        })
        const mappedFormData = mapBudgetToFormData(editingBudget)
        console.log('🎯 About to set form data:', mappedFormData)
        setFormData(mappedFormData)
        console.log('✅ Form data set successfully')
        
        // Verify state change with a small delay
        setTimeout(() => {
          console.log('🔍 Verification: formData should now be set')
        }, 50)
      } else {
        setFormData({
          name: '',
          amount: '',
          currency: 'EUR',
          periodType: 'monthly',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          categoryId: '',
          subcategoryId: '',
          alertThreshold: '80',
          isActive: true
        })
      }
    }
    setErrors({})
  }, [editingBudget, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Budget name is required'
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Budget name must be at least 3 characters'
    }

    if (!formData.amount || parseFloat(formData.amount) < 0) {
      newErrors.amount = 'Amount must be 0 or greater'
    }

    if (!formData.currency) {
      newErrors.currency = 'Currency is required'
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }

    if (formData.endDate && formData.startDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date'
    }

    if (formData.periodType === 'custom' && !formData.endDate) {
      newErrors.endDate = 'End date is required for custom period'
    }

    const alertThreshold = parseFloat(formData.alertThreshold)
    if (isNaN(alertThreshold) || alertThreshold <= 0 || alertThreshold > 100) {
      newErrors.alertThreshold = 'Alert threshold must be between 1 and 100'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      const submitData = {
        name: formData.name.trim(),
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        periodType: formData.periodType,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        categoryId: formData.categoryId || undefined,
        subcategoryId: formData.subcategoryId || undefined,
        alertThreshold: parseFloat(formData.alertThreshold),
        isActive: formData.isActive
      }

      await onSubmit(submitData)
      onClose()
    } catch (error) {
      console.error('Failed to submit budget:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleDateChange = (name: string, date: Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      [name]: date ? format(date, 'yyyy-MM-dd') : ''
    }))
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card key={editingBudget?.id || 'new'} className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{editingBudget ? 'Edit Budget' : 'Create New Budget'}</CardTitle>
            <CardDescription>
              {editingBudget ? 'Update your budget settings' : 'Set spending limits and track your progress'}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Budget Name *
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g., Monthly Groceries, Vacation Fund"
                  value={formData.name}
                  onChange={handleChange}
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
                <label htmlFor="amount" className="block text-sm font-medium mb-1">
                  Budget Amount *
                </label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={handleChange}
                  className={errors.amount ? 'border-red-500' : ''}
                />
                {errors.amount && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.amount}
                  </div>
                )}
              </div>

              <div>
                <CurrencySelect
                  currencies={currencies}
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value || '' }))}
                  label="Currency"
                  placeholder="Select currency"
                  height="h-10"
                  required={true}
                  className={errors.currency ? 'border-red-500' : ''}
                />
                {errors.currency && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.currency}
                  </div>
                )}
              </div>

              <div>
                <FormSelect
                  options={periodTypeOptions}
                  value={formData.periodType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, periodType: (value as any) || '' }))}
                  label="Period Type"
                  placeholder="Select period type"
                  height="h-10"
                  required={true}
                />
              </div>

              <div className="md:col-span-2">
                <CategorySubcategorySelect
                  categoryTree={categoryTree}
                  selectedCategoryId={formData.categoryId}
                  selectedSubcategoryId={formData.subcategoryId}
                  onCategoryChange={(categoryId) => setFormData(prev => ({ ...prev, categoryId: categoryId || '' }))}
                  onSubcategoryChange={(subcategoryId) => setFormData(prev => ({ ...prev, subcategoryId: subcategoryId || '' }))}
                  categoryLabel="Primary Category (Optional)"
                  subcategoryLabel="Subcategory (Optional)"
                  categoryPlaceholder="All Primary Categories"
                  subcategoryPlaceholder="All Subcategories"
                  height="h-10"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Start Date *
                </label>
                <DatePicker
                  date={formData.startDate ? new Date(formData.startDate) : undefined}
                  onDateChange={(date) => handleDateChange('startDate', date)}
                  placeholder="Select start date"
                  className={errors.startDate ? 'border-red-500' : ''}
                />
                {errors.startDate && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.startDate}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  End Date {formData.periodType === 'custom' ? '*' : '(Optional)'}
                </label>
                <DatePicker
                  date={formData.endDate ? new Date(formData.endDate) : undefined}
                  onDateChange={(date) => handleDateChange('endDate', date)}
                  placeholder="Select end date"
                  className={errors.endDate ? 'border-red-500' : ''}
                />
                {errors.endDate && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.endDate}
                  </div>
                )}
              </div>
            </div>

            {/* Alert Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="alertThreshold" className="block text-sm font-medium mb-1">
                  Alert Threshold (%) *
                </label>
                <Input
                  id="alertThreshold"
                  name="alertThreshold"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="80"
                  value={formData.alertThreshold}
                  onChange={handleChange}
                  className={errors.alertThreshold ? 'border-red-500' : ''}
                />
                {errors.alertThreshold && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.alertThreshold}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Get notified when spending reaches this percentage
                </p>
              </div>

              {editingBudget && (
                <div className="flex items-center space-x-2 mt-6">
                  <input
                    id="isActive"
                    name="isActive"
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium">
                    Budget is active
                  </label>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : editingBudget ? 'Update Budget' : 'Create Budget'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}