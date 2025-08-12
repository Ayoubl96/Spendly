import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { DatePicker } from '../ui/date-picker'
import { CurrencyConversionEditor } from '../ui/currency-conversion-editor'

import { CategorySubcategorySelect } from '../ui/category-select'
import { PaymentMethodSelect } from '../ui/payment-method-select'
import { useAuthStore } from '../../stores/auth.store'
import { useExpenseStore } from '../../stores/expense.store'

import { useCurrencyConversion } from '../../hooks/useCurrencyConversion'
import { CreateExpenseRequest, Expense, ExpenseShareCreate } from '../../types/api.types'
import { X } from 'lucide-react'
import { format } from 'date-fns'
import { isSameCurrency, safeNumberConversion } from '../../utils/currency'
import { SharedExpenseConfig } from '../expenses/SharedExpenseConfig'

// Component for editing tags in the expense form
interface TagEditorProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

const TagEditor: React.FC<TagEditorProps> = ({ tags, onTagsChange }) => {
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
        <Input
          placeholder="Add a tag..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={handleAddTag}
          disabled={!newTag.trim() || tags.includes(newTag.trim())}
          size="sm"
          variant="outline"
        >
          Add
        </Button>
      </div>
      
      {/* Display current tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
            >
              {tag}
              <button
                type="button"
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

interface ExpenseFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (expense: CreateExpenseRequest) => void
  editExpense?: Expense | null
}

export function ExpenseForm({ isOpen, onClose, onSubmit, editExpense }: ExpenseFormProps) {
  const { user } = useAuthStore()
  const { categoryTree, users, currencies, fetchCategoryTree, fetchUsers, fetchCurrencies } = useExpenseStore()
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    currency: user?.defaultCurrency || 'EUR',
    category: undefined as string | undefined,
    subcategory: undefined as string | undefined,
    amount_in_base_currency: '',
    exchangeRate: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: '', // Legacy field for backward compatibility
    paymentMethodId: null as string | null, // New field for user payment methods
    notes: '',
    location: '',
    vendor: '',
    isShared: false,
    tags: [] as string[],
    sharedWith: [] as string[], // Legacy support
    sharedExpenseParticipants: [] as ExpenseShareCreate[]
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

  // Fetch categories, users, and currencies when component mounts
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
    }
  }, [isOpen, categoryTree.length, users.length, currencies.length, fetchCategoryTree, fetchUsers, fetchCurrencies])

  // Update conversion data when API data changes
  useEffect(() => {
    if (conversionData && !hasManualConversion) {
      // Ensure values are numbers (backend might return strings)
      setConvertedAmount(safeNumberConversion(conversionData.converted_amount, 0))
      setExchangeRate(safeNumberConversion(conversionData.exchange_rate, 1))
    }
  }, [conversionData, hasManualConversion])

  // Reset manual conversion when currency changes (but not during initial form load)
  const [isFormInitialized, setIsFormInitialized] = useState(false)
  
  useEffect(() => {
    if (isOpen) {
      setIsFormInitialized(true)
    } else {
      setIsFormInitialized(false)
    }
  }, [isOpen])

  useEffect(() => {
    // Only reset manual conversion if form is initialized and currency actually changed by user
    if (isFormInitialized && !editExpense) {
      setHasManualConversion(false)
    }
  }, [formData.currency, isFormInitialized, editExpense])

  // Populate form data when editing an expense
  useEffect(() => {
    if (!isOpen) return

    const defaultCurrency = user?.defaultCurrency || 'EUR'
    
    if (editExpense) {
      
      // Only set form data if category tree is loaded (for edit mode) or if it's a new expense
      if (categoryTree.length > 0 || !editExpense.categoryId) {
        const categoryId = editExpense.categoryId || undefined
        const subcategoryId = editExpense.subcategoryId || undefined
        
        setFormData({
          description: editExpense.description ?? '',
          amount: editExpense.amount?.toString() ?? '',
          currency: editExpense.currency ?? defaultCurrency,
          category: categoryId,
          subcategory: subcategoryId,
          amount_in_base_currency: editExpense.amountInBaseCurrency?.toString() ?? '',
          exchangeRate: editExpense.exchangeRate?.toString() ?? '',
          expenseDate: editExpense.expenseDate ?? new Date().toISOString().split('T')[0],
          paymentMethod: editExpense.paymentMethod ?? '',
          paymentMethodId: editExpense.paymentMethodId ?? null,
          notes: editExpense.notes ?? '',
          location: editExpense.location ?? '',
          vendor: editExpense.vendor ?? '',
          isShared: editExpense.isShared ?? false,
          tags: editExpense.tags ?? [],
          sharedWith: editExpense.sharedWith ?? [],
          sharedExpenseParticipants: [] // TODO: Load existing shares from API when editing
        })

        // Set conversion data if available
        if (editExpense.amountInBaseCurrency && editExpense.exchangeRate) {
          setConvertedAmount(parseFloat(editExpense.amountInBaseCurrency.toString()))
          setExchangeRate(parseFloat(editExpense.exchangeRate.toString()))
          setHasManualConversion(true)
        } else {
          setConvertedAmount(0)
          setExchangeRate(1)
          setHasManualConversion(false)
        }
      }
    } else {
      // Reset form for new expense
      setFormData({
        description: '',
        amount: '',
        currency: defaultCurrency,
        category: undefined,
        subcategory: undefined,
        amount_in_base_currency: '',
        exchangeRate: '',
        expenseDate: new Date().toISOString().split('T')[0],
        paymentMethod: '',
        paymentMethodId: null,
        notes: '',
        location: '',
        vendor: '',
        isShared: false,
        tags: [],
        sharedWith: [],
        sharedExpenseParticipants: []
      })
      setConvertedAmount(0)
      setExchangeRate(1)
      setHasManualConversion(false)
    }
  }, [editExpense?.id, isOpen, categoryTree.length]) // Depend on categoryTree.length to wait for it to load

  const handleConvertedAmountChange = (amount: number, rate: number) => {
    setConvertedAmount(amount)
    setExchangeRate(rate)
    setHasManualConversion(true)
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
      categoryId: formData.category,
      subcategoryId: formData.subcategory,
      amount_in_base_currency: parseFloat(formData.amount_in_base_currency),
      exchange_rate: parseFloat(formData.exchangeRate),
      paymentMethod: (formData.paymentMethod as 'cash' | 'card' | 'bank_transfer' | 'other') || undefined,
      paymentMethodId: formData.paymentMethodId || undefined,
      notes: formData.notes || undefined,
      location: formData.location || undefined,
      vendor: formData.vendor || undefined,
      isShared: formData.isShared,
      sharedWith: formData.isShared && formData.sharedWith.length > 0 ? formData.sharedWith : undefined, // Legacy support
      tags: formData.tags && formData.tags.length > 0 ? formData.tags : undefined,
      sharedExpenseConfig: formData.isShared && formData.sharedExpenseParticipants.length > 0 ? {
        participants: formData.sharedExpenseParticipants,
        autoCalculate: false
      } : undefined
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
      

    }

    onSubmit(submissionData)
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
        
        // Handle shared expense logic
        if (name === 'isShared') {
          if (!checked) {
            // Reset shared users when isShared is unchecked
            newData.sharedWith = []
            newData.sharedExpenseParticipants = []
          } else {
            // Auto-include current user when isShared is checked
            if (user && user.id) {
              newData.sharedExpenseParticipants = [{
                userId: user.id,
                sharePercentage: 100,
                shareAmount: parseFloat(prev.amount) || 0,
                currency: prev.currency,
                shareType: 'equal',
                customAmount: undefined
              }]
            }
          }
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

  const handleTagsChange = (tags: string[]) => {
    setFormData(prev => ({
      ...prev,
      tags
    }))
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

  const handleSharedExpenseParticipantsChange = (participants: ExpenseShareCreate[]) => {
    setFormData(prev => ({
      ...prev,
      sharedExpenseParticipants: participants
    }))
  }

  // Categories are now handled by CategorySubcategorySelect component

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 mt-0">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{editExpense ? 'Edit Expense' : 'Add New Expense'}</CardTitle>
            <CardDescription>{editExpense ? 'Update your expense details' : 'Track your spending'}</CardDescription>
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
              key={`category-select-${editExpense?.id || 'new'}-${formData.category}-${formData.subcategory}`}
              categoryTree={categoryTree}
              selectedCategoryId={formData.category}
              selectedSubcategoryId={formData.subcategory}
              onCategoryChange={(categoryId) => {
                setFormData(prev => ({ 
                  ...prev, 
                  category: categoryId
                }))
              }}
              onSubcategoryChange={(subcategoryId) => {
                setFormData(prev => ({ ...prev, subcategory: subcategoryId }))
              }}
              categoryLabel="Category"
              subcategoryLabel="Subcategory"
              categoryPlaceholder="Select category"
              subcategoryPlaceholder="Select subcategory"
              height="h-10"
              required={true}
            />
            




            {/* Payment & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium mb-1">
                  Payment Method
                </label>
                <PaymentMethodSelect
                  value={formData.paymentMethodId || formData.paymentMethod || null}
                  onChange={(selectedValue) => {
                    if (!selectedValue) {
                      // Clear both fields if no selection
                      setFormData(prev => ({
                        ...prev,
                        paymentMethodId: null,
                        paymentMethod: ''
                      }))
                      return
                    }

                    // Check if it's a legacy method (cash, card, bank_transfer, other)
                    const isLegacy = ['cash', 'card', 'bank_transfer', 'other'].includes(selectedValue)
                    
                    setFormData(prev => ({
                      ...prev,
                      paymentMethodId: isLegacy ? null : selectedValue,
                      paymentMethod: isLegacy ? selectedValue : ''
                    }))
                  }}
                  placeholder="Select payment method (optional)..."
                  required={false}
                />
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
                <label className="block text-sm font-medium mb-1">
                  Tags
                </label>
                <TagEditor 
                  tags={formData.tags}
                  onTagsChange={handleTagsChange}
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

              {/* Enhanced shared expense configuration */}
              {formData.isShared && (
                <SharedExpenseConfig
                  totalAmount={parseFloat(formData.amount) || 0}
                  currency={formData.currency}
                  participants={formData.sharedExpenseParticipants}
                  onParticipantsChange={handleSharedExpenseParticipantsChange}
                />
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                {editExpense ? 'Update Expense' : 'Add Expense'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}