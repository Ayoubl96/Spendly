import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { DatePicker } from '../ui/date-picker'
import { CurrencyConversionEditor } from '../ui/currency-conversion-editor'
import { CurrencyAmountDisplay } from '../ui/currency-amount-display'
import { CategorySubcategorySelect } from '../ui/category-select'
import { useAuthStore } from '../../stores/auth.store'
import { useExpenseStore } from '../../stores/expense.store'
import { useBudgetStore } from '../../stores/budget.store'
import { useCurrencyConversion } from '../../hooks/useCurrencyConversion'
import { CreateExpenseRequest, Budget } from '../../types/api.types'
import { X, AlertTriangle, CheckCircle, PiggyBank } from 'lucide-react'
import { format } from 'date-fns'
import { isSameCurrency, safeNumberConversion } from '../../utils/currency'

interface ExpenseFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (expense: CreateExpenseRequest) => void
}

export function ExpenseForm({ isOpen, onClose, onSubmit }: ExpenseFormProps) {
  const { user } = useAuthStore()
  const { categoryTree, users, currencies, fetchCategoryTree, fetchUsers, fetchCurrencies } = useExpenseStore()
  const { budgets, fetchBudgets, getBudgetPerformance, budgetPerformances } = useBudgetStore()
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    currency: user?.defaultCurrency || 'EUR',
    category: '',
    subcategory: '',
    amount_in_base_currency: '',
    exchangeRate: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    notes: '',
    location: '',
    vendor: '',
    isShared: false,
    tags: '',
    sharedWith: [] as string[]
  })
  
  const [convertedAmount, setConvertedAmount] = useState<number>(0)
  const [exchangeRate, setExchangeRate] = useState<number>(1)
  const [hasManualConversion, setHasManualConversion] = useState(false)

  // Use the custom hook for currency conversion
  const { conversionData, isLoading: isLoadingConversion } = useCurrencyConversion({
    amount: formData.amount,
    fromCurrency: formData.currency,
    toCurrency: user?.defaultCurrency || 'EUR',
    enabled: !hasManualConversion && !isSameCurrency(formData.currency, user?.defaultCurrency || 'EUR')
  })

  // Fetch categories, users, currencies, and budgets when component mounts
  useEffect(() => {
    if (isOpen) {
      if (categoryTree.length === 0) {
        fetchCategoryTree()
      }
      if (users.length === 0) {
        fetchUsers()
      }
      if (currencies.length === 0) {
        fetchCurrencies()
      }
      if (budgets.length === 0) {
        fetchBudgets()
      }
    }
  }, [isOpen, categoryTree.length, users.length, currencies.length, budgets.length, fetchCategoryTree, fetchUsers, fetchCurrencies, fetchBudgets])

  // Update conversion data when API data changes
  useEffect(() => {
    if (conversionData && !hasManualConversion) {
      // Ensure values are numbers (backend might return strings)
      setConvertedAmount(safeNumberConversion(conversionData.converted_amount, 0))
      setExchangeRate(safeNumberConversion(conversionData.exchange_rate, 1))
    }
  }, [conversionData, hasManualConversion])

  // Reset manual conversion when currency changes
  useEffect(() => {
    setHasManualConversion(false)
  }, [formData.currency, user?.defaultCurrency])

  const handleConvertedAmountChange = (amount: number, rate: number) => {
    console.log('Manual conversion edit:', { amount, rate, hasManualConversion: true })
    setConvertedAmount(amount)
    setExchangeRate(rate)
    setHasManualConversion(true)
  }

  // Get relevant budgets for this expense
  const getRelevantBudgets = () => {
    const expenseDate = new Date(formData.expenseDate)
    const expenseAmount = parseFloat(formData.amount) || 0
    
    return budgets.filter(budget => {
      if (!budget.is_active) return false
      
      // Check if expense date falls within budget period
      const budgetStart = new Date(budget.startDate)
      const budgetEnd = budget.endDate ? new Date(budget.endDate) : null
      
      if (expenseDate < budgetStart) return false
      if (budgetEnd && expenseDate > budgetEnd) return false
      
      // Check if budget is for the same category or is a general budget
      if (budget.categoryId && formData.category && budget.categoryId !== formData.category) return false
      
      return true
    })
  }

  const relevantBudgets = getRelevantBudgets()
  const expenseAmount = parseFloat(formData.amount) || 0

  // Load budget performance data for relevant budgets
  useEffect(() => {
    relevantBudgets.forEach(budget => {
      if (!budgetPerformances[budget.id]) {
        getBudgetPerformance(budget.id).catch(console.error)
      }
    })
  }, [relevantBudgets, budgetPerformances, getBudgetPerformance])

  // Calculate budget impact
  const getBudgetImpact = (budget: Budget) => {
    const performance = budgetPerformances[budget.id]
    if (!performance) return null
    
    const newSpent = performance.spent + expenseAmount
    const newPercentage = (newSpent / budget.amount) * 100
    const willExceedAlert = newPercentage >= budget.alertThreshold
    const willExceedBudget = newSpent > budget.amount
    
    return {
      currentSpent: performance.spent,
      newSpent,
      currentPercentage: performance.percentage_used,
      newPercentage,
      willExceedAlert,
      willExceedBudget,
      budgetRemaining: budget.amount - newSpent
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.description || !formData.amount) {
      alert('Please fill in all required fields')
      return
    }

    const submissionData: CreateExpenseRequest = {
      description: formData.description,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      expenseDate: formData.expenseDate,
      categoryId: formData.category || undefined,
      subcategoryId: formData.subcategory || undefined,
      amount_in_base_currency: parseFloat(formData.amount_in_base_currency),
      exchange_rate: parseFloat(formData.exchangeRate),
      paymentMethod: formData.paymentMethod as 'cash' | 'card' | 'bank_transfer' | 'other',
      notes: formData.notes || undefined,
      location: formData.location || undefined,
      vendor: formData.vendor || undefined,
      isShared: formData.isShared,
      sharedWith: formData.isShared && formData.sharedWith.length > 0 ? formData.sharedWith : undefined,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : undefined
    }

    // Add conversion data if currencies differ
    if (!isSameCurrency(formData.currency, user?.defaultCurrency || 'EUR')) {
      // Always send conversion data - backend will use whatever we provide
      const finalConvertedAmount = hasManualConversion 
        ? convertedAmount 
        : safeNumberConversion(conversionData?.converted_amount, 0)
      const finalExchangeRate = hasManualConversion 
        ? exchangeRate 
        : safeNumberConversion(conversionData?.exchange_rate, 1)
        
      submissionData.amount_in_base_currency = finalConvertedAmount
      submissionData.exchange_rate = finalExchangeRate
      
      console.log('Sending conversion data:', { 
        amount_in_base_currency: finalConvertedAmount, 
        exchange_rate: finalExchangeRate,
        source: hasManualConversion ? 'manual' : 'api'
      })
    }

    onSubmit(submissionData)

    // Reset form
    setFormData({
      description: '',
      amount: '',
      currency: user?.defaultCurrency || 'EUR',
      category: '',
      subcategory: '',
      amount_in_base_currency: '',
      exchangeRate: '',
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      notes: '',
      location: '',
      vendor: '',
      isShared: false,
      tags: '',
      sharedWith: []
    })
    
    // Reset conversion state
    setConvertedAmount(0)
    setExchangeRate(1)
    setHasManualConversion(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, type, value } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: checked
        }
        
        // Reset shared users when isShared is unchecked
        if (name === 'isShared' && !checked) {
          newData.sharedWith = []
        }
        
        return newData
      })
    } else {
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: value
        }
        
        // Reset subcategory when category changes
        if (name === 'category') {
          newData.subcategory = ''
        }
        
        return newData
      })
    }
  }

  const handleUserToggle = (userId: string) => {
    setFormData(prev => {
      const newSharedWith = prev.sharedWith.includes(userId)
        ? prev.sharedWith.filter(id => id !== userId)
        : [...prev.sharedWith, userId]
      
      return {
        ...prev,
        sharedWith: newSharedWith
      }
    })
  }

  // Categories are now handled by CategorySubcategorySelect component

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 mt-0">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Add New Expense</CardTitle>
            <CardDescription>Track your spending</CardDescription>
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
                <label htmlFor="description" className="block text-sm font-medium mb-1">
                  Description *
                </label>
                <Input
                  id="description"
                  name="description"
                  type="text"
                  placeholder="e.g., Coffee at Starbucks"
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium mb-1">
                  Amount *
                </label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="currency" className="block text-sm font-medium mb-1">
                  Currency
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name} ({currency.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Date
                </label>
                <DatePicker
                  date={formData.expenseDate ? new Date(formData.expenseDate) : new Date()}
                  onDateChange={(date) => {
                    if (date) {
                      setFormData(prev => ({
                        ...prev,
                        expenseDate: format(date, 'yyyy-MM-dd')
                      }))
                    }
                  }}
                  placeholder="Select expense date"
                />
              </div>
            </div>

            {/* Currency Conversion Editor */}
            <CurrencyConversionEditor
              originalAmount={formData.amount}
              originalCurrency={formData.currency}
              targetCurrency={user?.defaultCurrency || 'EUR'}
              exchangeRate={exchangeRate || safeNumberConversion(conversionData?.exchange_rate, 1)}
              onOriginalAmountChange={(amount) => setFormData(prev => ({ ...prev, amount }))}
              onConvertedAmountChange={handleConvertedAmountChange}
              isLoading={isLoadingConversion}
            />

            {/* Categories */}
            <CategorySubcategorySelect
              categoryTree={categoryTree}
              selectedCategoryId={formData.category}
              selectedSubcategoryId={formData.subcategory}
              onCategoryChange={(categoryId) => setFormData(prev => ({ ...prev, category: categoryId || '' }))}
              onSubcategoryChange={(subcategoryId) => setFormData(prev => ({ ...prev, subcategory: subcategoryId || '' }))}
              categoryLabel="Category"
              subcategoryLabel="Subcategory"
              categoryPlaceholder="Select category"
              subcategoryPlaceholder="Select subcategory"
              height="h-10"
              required={true}
            />

            {/* Budget Impact Information */}
            {relevantBudgets.length > 0 && expenseAmount > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <PiggyBank className="h-4 w-4" />
                  Budget Impact
                </h3>
                <div className="space-y-2">
                  {relevantBudgets.map((budget) => {
                    const impact = getBudgetImpact(budget)
                    if (!impact) return null

                    return (
                      <div 
                        key={budget.id} 
                        className={`p-3 rounded-lg border ${
                          impact.willExceedBudget 
                            ? 'border-red-200 bg-red-50' 
                            : impact.willExceedAlert 
                            ? 'border-yellow-200 bg-yellow-50' 
                            : 'border-green-200 bg-green-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-sm">{budget.name}</h4>
                            <p className="text-xs text-gray-600">
                              {budget.periodType} budget
                              {budget.categoryId && (
                                <span> • Category specific</span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {impact.willExceedBudget ? (
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            ) : impact.willExceedAlert ? (
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-gray-600">Current Spent:</span>
                            <div className="font-medium">
                              <CurrencyAmountDisplay 
                                amount={impact.currentSpent} 
                                currency={budget.currency} 
                              />
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">After This Expense:</span>
                            <div className={`font-medium ${
                              impact.willExceedBudget ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              <CurrencyAmountDisplay 
                                amount={impact.newSpent} 
                                currency={budget.currency} 
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-600">Budget Usage</span>
                            <span className="font-medium">
                              {Math.round(impact.currentPercentage)}% → {Math.round(impact.newPercentage)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                impact.newPercentage > 100 
                                  ? 'bg-red-500' 
                                  : impact.newPercentage >= budget.alertThreshold 
                                  ? 'bg-yellow-500' 
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, impact.newPercentage))}%` }}
                            />
                          </div>
                        </div>

                        {impact.willExceedBudget && (
                          <div className="mt-2 text-xs text-red-700 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>
                              This expense will exceed your budget by{' '}
                              <CurrencyAmountDisplay 
                                amount={Math.abs(impact.budgetRemaining)} 
                                currency={budget.currency} 
                                className="font-medium"
                              />
                            </span>
                          </div>
                        )}

                        {!impact.willExceedBudget && impact.willExceedAlert && (
                          <div className="mt-2 text-xs text-yellow-700 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>
                              This expense will trigger your {budget.alertThreshold}% alert threshold
                            </span>
                          </div>
                        )}

                        {!impact.willExceedBudget && !impact.willExceedAlert && (
                          <div className="mt-2 text-xs text-green-700 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>
                              You'll have{' '}
                              <CurrencyAmountDisplay 
                                amount={impact.budgetRemaining} 
                                currency={budget.currency} 
                                className="font-medium"
                              />
                              {' '}remaining in this budget
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* No Budget Warning */}
            {relevantBudgets.length === 0 && budgets.length > 0 && expenseAmount > 0 && (
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                <div className="flex items-center gap-2 text-blue-800">
                  <PiggyBank className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    No matching budgets found for this expense
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Consider creating a budget for{' '}
                  {formData.category ? 'this category' : 'your expenses'} to better track your spending.
                </p>
              </div>
            )}

            {/* Payment & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium mb-1">
                  Payment Method
                </label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="vendor" className="block text-sm font-medium mb-1">
                  Vendor
                </label>
                <Input
                  id="vendor"
                  name="vendor"
                  type="text"
                  placeholder="e.g., Starbucks, Amazon"
                  value={formData.vendor}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium mb-1">
                  Location
                </label>
                <Input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="e.g., Downtown, Mall"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium mb-1">
                  Tags
                </label>
                <Input
                  id="tags"
                  name="tags"
                  type="text"
                  placeholder="e.g., business, personal (comma separated)"
                  value={formData.tags}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
              />
            </div>

            {/* Shared expense */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  id="isShared"
                  name="isShared"
                  type="checkbox"
                  checked={formData.isShared}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <label htmlFor="isShared" className="text-sm font-medium">
                  Shared expense
                </label>
              </div>

              {/* User selection for shared expenses */}
              {formData.isShared && (
                <div className="ml-6 space-y-2">
                  <label className="text-sm font-medium">Share with:</label>
                  <div className="max-h-32 overflow-y-auto space-y-1 border rounded-md p-2">
                    {users.length > 0 ? (
                      users.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2">
                          <input
                            id={`user-${user.id}`}
                            type="checkbox"
                            checked={formData.sharedWith.includes(user.id)}
                            onChange={() => handleUserToggle(user.id)}
                            className="h-4 w-4 rounded border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          />
                          <label htmlFor={`user-${user.id}`} className="text-sm cursor-pointer">
                            {user.firstName} {user.lastName} ({user.email})
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No other users available</p>
                    )}
                  </div>
                  {formData.sharedWith.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Selected {formData.sharedWith.length} user(s)
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Add Expense
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}