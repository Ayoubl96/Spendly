import React, { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { PaymentMethod } from '../../types/api.types'
import apiService from '../../services/api.service'
import { Banknote, CreditCard, Building, Smartphone } from 'lucide-react'

interface PaymentMethodFilterProps {
  value?: string
  onChange: (value: string | undefined) => void
}

export function PaymentMethodFilter({ value, onChange }: PaymentMethodFilterProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPaymentMethods()
  }, [])

  const loadPaymentMethods = async () => {
    try {
      setLoading(true)
      const methods = await apiService.getPaymentMethods(false) // Only active methods
      setPaymentMethods(methods)
    } catch (err) {
      console.error('Error loading payment methods:', err)
      // Silently fall back to legacy methods if user payment methods fail
    } finally {
      setLoading(false)
    }
  }

  const getMethodIcon = (iconName?: string) => {
    const iconComponents: Record<string, React.ReactElement> = {
      'banknote': <Banknote className="h-4 w-4" />,
      'credit-card': <CreditCard className="h-4 w-4" />,
      'building-columns': <Building className="h-4 w-4" />,
      'smartphone': <Smartphone className="h-4 w-4" />,
      'wallet': <CreditCard className="h-4 w-4" />,
      'university': <Building className="h-4 w-4" />,
      'gift': <CreditCard className="h-4 w-4" />,
      'coins': <Banknote className="h-4 w-4" />,
      'landmark': <Building className="h-4 w-4" />,
      'ellipsis-horizontal-circle': <Smartphone className="h-4 w-4" />
    }
    return iconComponents[iconName || 'credit-card'] || <CreditCard className="h-4 w-4" />
  }

  const getLegacyIcon = (method: string) => {
    const legacyIcons: Record<string, React.ReactElement> = {
      'cash': <Banknote className="h-4 w-4" />,
      'card': <CreditCard className="h-4 w-4" />,
      'bank_transfer': <Building className="h-4 w-4" />,
      'other': <Smartphone className="h-4 w-4" />
    }
    return legacyIcons[method] || <CreditCard className="h-4 w-4" />
  }

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder="All Methods" />
      </SelectTrigger>
      <SelectContent>
        {/* User Payment Methods */}
        {paymentMethods.length > 0 && (
          <>
            {paymentMethods.map((method) => (
              <SelectItem key={method.id} value={method.id}>
                <span className="flex items-center gap-2">
                  {getMethodIcon(method.icon)}
                  <span>{method.name}</span>
                </span>
              </SelectItem>
            ))}
            
            {/* Separator for legacy methods */}
            <div className="border-t border-gray-200 my-1"></div>
            <div className="px-2 py-1 text-xs text-gray-500 font-medium">
              Legacy Methods
            </div>
          </>
        )}
        
        {/* Legacy Payment Methods - always available as fallback */}
        <SelectItem value="cash">
          <span className="flex items-center gap-2">
            {getLegacyIcon('cash')}
            <span>Cash</span>
          </span>
        </SelectItem>
        <SelectItem value="card">
          <span className="flex items-center gap-2">
            {getLegacyIcon('card')}
            <span>Card</span>
          </span>
        </SelectItem>
        <SelectItem value="bank_transfer">
          <span className="flex items-center gap-2">
            {getLegacyIcon('bank_transfer')}
            <span>Bank Transfer</span>
          </span>
        </SelectItem>
        <SelectItem value="other">
          <span className="flex items-center gap-2">
            {getLegacyIcon('other')}
            <span>Other</span>
          </span>
        </SelectItem>
        
        {paymentMethods.length === 0 && !loading && (
          <div className="px-2 py-1 text-xs text-gray-500">
            No custom payment methods. Create some in Settings.
          </div>
        )}
      </SelectContent>
    </Select>
  )
}
