import React from 'react'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { CurrencyAmountDisplay } from '../ui/currency-amount-display'
import { PaymentMethodDisplay } from './PaymentMethodDisplay'
import { SharedExpenseDisplay } from './SharedExpenseDisplay'
import { Expense, ExpenseWithDetails, Category } from '../../types/api.types'
import { useAuthStore } from '../../stores/auth.store'
import { formatDate } from '../../lib/utils'
import { isSameCurrency } from '../../utils/currency'
import { IconRenderer } from '../../utils/iconRenderer'
import { 
  Receipt, 
  Trash2, 
  Edit, 
  MapPin, 
  Store, 
  StickyNote, 
  Tag,

  Calendar,
  FolderOpen
} from 'lucide-react'

interface ExpenseCardProps {
  expense: Expense | ExpenseWithDetails
  category?: Category
  subcategory?: Category
  onEdit?: (expense: Expense) => void
  onDelete?: (expenseId: string) => void
}

export function ExpenseCard({ expense, category, subcategory, onEdit, onDelete }: ExpenseCardProps) {
  const { user } = useAuthStore()



  const formatTags = (tags?: string[]) => {
    if (!tags || tags.length === 0) return null
    return tags.map(tag => (
      <span key={tag} className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
        {tag}
      </span>
    ))
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4" 
          style={{ borderLeftColor: category?.color || '#e5e7eb' }}>
      <CardContent className="p-0">
        {/* Header Section */}
        <div className="p-4 pb-3 border-b bg-gray-50/30">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  {expense.receiptUrl && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" title="Has receipt" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 leading-tight mb-1">{expense.description}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <span>{formatDate(expense.expenseDate)}</span>
                    </div>
                    <PaymentMethodDisplay
                      paymentMethodId={expense.paymentMethodId}
                      legacyPaymentMethod={expense.paymentMethod}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Amount - Enhanced Display for Shared vs Regular Expenses */}
            <div className="text-right">
              {expense.isShared && expense.userShareAmount !== undefined && expense.userShareAmount > 0 ? (
                // Shared Expense: Show user's portion prominently, total as secondary
                <div>
                  <div className="font-bold text-xl text-blue-600">
                    <CurrencyAmountDisplay 
                      amount={expense.userShareAmount} 
                      currency={expense.currency}
                      showCurrencyCode={true}
                    />
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    of <CurrencyAmountDisplay 
                      amount={expense.amount} 
                      currency={expense.currency}
                      showCurrencyCode={false}
                    /> total
                  </div>
                  {expense.userSharePercentage && (
                    <div className="text-xs text-gray-500">
                      {(typeof expense.userSharePercentage === 'number' ? expense.userSharePercentage : parseFloat(expense.userSharePercentage || '0')).toFixed(1)}% share
                    </div>
                  )}
                </div>
              ) : expense.isShared ? (
                // Shared but user has no portion (0% share)
                <div>
                  <div className="font-bold text-xl text-gray-400">
                    <CurrencyAmountDisplay 
                      amount={0} 
                      currency={expense.currency}
                      showCurrencyCode={true}
                    />
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    of <CurrencyAmountDisplay 
                      amount={expense.amount} 
                      currency={expense.currency}
                      showCurrencyCode={false}
                    /> total
                  </div>
                  <div className="text-xs text-gray-500">
                    0% share
                  </div>
                </div>
              ) : (
                // Regular Expense: Show full amount
                <div>
                  <div className="font-bold text-xl text-gray-900">
                    <CurrencyAmountDisplay 
                      amount={expense.amount} 
                      currency={expense.currency}
                      showCurrencyCode={true}
                    />
                  </div>
                  {/* Converted Amount - Compact */}
                  {expense.amountInBaseCurrency && 
                   expense.exchangeRate && 
                   !isSameCurrency(expense.currency, user?.defaultCurrency || 'EUR') && (
                    <div className="text-sm text-gray-600 mt-1">
                      <CurrencyAmountDisplay 
                        amount={expense.amountInBaseCurrency} 
                        currency={user?.defaultCurrency || 'EUR'}
                      />
                      <span className="text-xs ml-1">({expense.exchangeRate} rate)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Section */}
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column - Categories & Core Info */}
            <div className="space-y-3">
              {/* Categories */}
              <div className="space-y-2">
                {category && (
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-gray-400" />
                    <span 
                      className="inline-flex items-center rounded-md px-2 py-1 text-sm font-medium border"
                      style={{
                        backgroundColor: category.color ? `${category.color}15` : '#f9fafb',
                        borderColor: category.color ? `${category.color}40` : '#e5e7eb',
                        color: category.color || '#374151'
                      }}
                    >
                      <IconRenderer icon={category.icon} className="mr-1" size={16} />
                      {category.name}
                    </span>
                  </div>
                )}
                
                {subcategory && (
                  <div className="flex items-center gap-2 ml-6">
                    <div className="w-3 h-0.5 bg-gray-300" />
                    <span 
                      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border"
                      style={{
                        backgroundColor: category?.color ? `${category.color}10` : '#f9fafb',
                        borderColor: category?.color ? `${category.color}30` : '#e5e7eb',
                        color: category?.color || '#6b7280'
                      }}
                    >
                      <IconRenderer icon={subcategory.icon} className="mr-1" size={12} />
                      {subcategory.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Location & Vendor */}
              {(expense.vendor || expense.location) && (
                <div className="flex items-center gap-4 text-sm">
                  {expense.vendor && (
                    <div className="flex items-center gap-1">
                      <Store className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900 font-medium">{expense.vendor}</span>
                    </div>
                  )}
                  {expense.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{expense.location}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Additional Info */}
            <div className="space-y-3">
              {/* Tags */}
              {expense.tags && expense.tags.length > 0 && (
                <div className="flex items-start gap-2">
                  <Tag className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {formatTags(expense.tags)}
                  </div>
                </div>
              )}

              {/* Shared Status */}
              <SharedExpenseDisplay expense={expense} showDetails={true} />
            </div>
          </div>

          {/* Notes - Full Width */}
          {expense.notes && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-start gap-2 text-sm">
                <StickyNote className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700 leading-relaxed">{expense.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="px-4 py-3 bg-gray-50/50 border-t flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>ID: {expense.id.slice(-8)}</span>
            {expense.receiptUrl && (
              <span className="flex items-center gap-1">
                <Receipt className="h-3 w-3" />
                Receipt attached
              </span>
            )}
          </div>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit?.(expense)}
              className="h-7 px-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete?.(expense.id)}
              className="h-7 px-2 text-gray-600 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}