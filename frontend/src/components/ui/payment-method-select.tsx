import React, { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { PaymentMethod } from '../../types/api.types'
import apiService from '../../services/api.service'

interface PaymentMethodSelectProps {
  value?: string | null
  onChange: (paymentMethodId: string | null) => void
  className?: string
  placeholder?: string
  required?: boolean
}

// Legacy payment methods as fallback
const LEGACY_METHODS = [
  { id: 'cash', name: 'Cash', icon: '💵', isLegacy: true },
  { id: 'card', name: 'Card', icon: '💳', isLegacy: true },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦', isLegacy: true },
  { id: 'other', name: 'Other', icon: '⚪', isLegacy: true }
]

export function PaymentMethodSelect({
  value,
  onChange,
  className = '',
  placeholder = 'Select payment method...',
  required = false
}: PaymentMethodSelectProps) {
  const [userPaymentMethods, setUserPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPaymentMethods()
  }, [])

  const loadPaymentMethods = async () => {
    try {
      setLoading(true)
      const methods = await apiService.getPaymentMethods(false) // Only active methods
      setUserPaymentMethods(methods)
    } catch (err) {
      console.error('Error loading payment methods:', err)
      // Don't show error, just use legacy methods
      setUserPaymentMethods([])
    } finally {
      setLoading(false)
    }
  }

  const getDisplayIcon = (iconName?: string, isLegacy?: boolean) => {
    if (isLegacy) return iconName
    
    const iconMap: Record<string, string> = {
      'banknote': '💵',
      'credit-card': '💳',
      'building-columns': '🏦',
      'smartphone': '📱',
      'wallet': '👛',
      'university': '🏛️',
      'gift': '🎁',
      'coins': '🪙',
      'landmark': '🏛️',
      'ellipsis-horizontal-circle': '⚪'
    }
    return iconMap[iconName || 'credit-card'] || '💳'
  }

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className={`h-10 ${className}`}>
          <SelectValue placeholder="Loading payment methods..." />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select 
      key={`payment-select-${userPaymentMethods.length}-${loading}`}
      value={value || undefined} 
      onValueChange={(val) => onChange(val || null)}
    >
      <SelectTrigger className={`h-10 ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {/* User Payment Methods */}
        {userPaymentMethods.length > 0 && (
          <>
            {userPaymentMethods.map((method) => (
              <SelectItem key={method.id} value={method.id}>
                <div className="flex items-center gap-2">
                  <span style={{ color: method.color || 'inherit' }}>
                    {getDisplayIcon(method.icon)}
                  </span>
                  <span>{method.name}</span>
                  {method.description && (
                    <span className="text-xs text-gray-500 ml-auto">
                      {method.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
            
            {/* Separator */}
            <div className="px-2 py-1">
              <div className="border-t border-gray-200"></div>
            </div>
            <div className="px-2 py-1">
              <span className="text-xs text-gray-500 font-medium">Legacy Methods</span>
            </div>
          </>
        )}
        
        {/* Legacy Payment Methods */}
        {LEGACY_METHODS.map((method) => (
          <SelectItem key={method.id} value={method.id}>
            <div className="flex items-center gap-2">
              <span>{method.icon}</span>
              <span>{method.name}</span>
              {userPaymentMethods.length === 0 && (
                <span className="text-xs text-gray-400 ml-auto">Default</span>
              )}
            </div>
          </SelectItem>
        ))}
        
        {userPaymentMethods.length === 0 && (
          <div className="px-2 py-1">
            <p className="text-xs text-gray-500">
              💡 Create custom payment methods in Settings for better organization.
            </p>
          </div>
        )}
      </SelectContent>
    </Select>
  )
}

// Legacy payment method selector for backward compatibility (kept for any existing usage)
interface LegacyPaymentMethodSelectProps {
  value?: string
  onChange: (paymentMethod: string) => void
  className?: string
}

export function LegacyPaymentMethodSelect({
  value,
  onChange,
  className = ''
}: LegacyPaymentMethodSelectProps) {
  return (
    <select
      value={value || 'cash'}
      onChange={(e) => onChange(e.target.value)}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <option value="cash">💵 Cash</option>
      <option value="card">💳 Card</option>
      <option value="bank_transfer">🏦 Bank Transfer</option>
      <option value="other">⚪ Other</option>
    </select>
  )
}