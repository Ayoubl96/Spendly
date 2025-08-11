import React, { useState, useEffect } from 'react'
import { PaymentMethod } from '../../types/api.types'
import apiService from '../../services/api.service'


interface PaymentMethodDisplayProps {
  paymentMethodId?: string
  legacyPaymentMethod?: string
  className?: string
}

// Cache for payment methods to avoid repeated API calls
let paymentMethodsCache: PaymentMethod[] | null = null
let cacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function PaymentMethodDisplay({ 
  paymentMethodId, 
  legacyPaymentMethod, 
  className = "" 
}: PaymentMethodDisplayProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [loading, setLoading] = useState(false)



  useEffect(() => {
    if (paymentMethodId) {
      loadPaymentMethodDetails()
    }
  }, [paymentMethodId])

  const loadPaymentMethodDetails = async () => {
    if (!paymentMethodId) return

    try {
      setLoading(true)
      
      // Use cache if available and fresh
      const now = Date.now()
      if (paymentMethodsCache && (now - cacheTime) < CACHE_DURATION) {
        const method = paymentMethodsCache.find(pm => pm.id === paymentMethodId)
        setPaymentMethod(method || null)
        setLoading(false)
        return
      }

      // Load all payment methods and cache them
      const paymentMethods = await apiService.getPaymentMethods(true) // Include inactive
      paymentMethodsCache = paymentMethods
      cacheTime = now
      
      const method = paymentMethods.find(pm => pm.id === paymentMethodId)
      setPaymentMethod(method || null)
    } catch (err) {
      console.error('Error loading payment method details:', err)
      setPaymentMethod(null)
    } finally {
      setLoading(false)
    }
  }

  const getLegacyIcon = (method?: string) => {
    switch (method) {
      case 'cash': return '💵'
      case 'card': return '💳'
      case 'bank_transfer': return '🏦'
      case 'other': return '⚪'
      default: return '❓'
    }
  }

  const formatLegacyMethod = (method?: string) => {
    if (!method) return 'No payment method'
    return method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getMethodIcon = (iconName?: string) => {
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

  // Show user payment method if available
  if (paymentMethodId && paymentMethod) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium"
          style={{ 
            backgroundColor: paymentMethod.color || '#3B82F6',
            color: 'white'
          }}
        >
          {getMethodIcon(paymentMethod.icon)}
        </div>
        <span className="text-sm font-medium">{paymentMethod.name}</span>
        {!paymentMethod.isActive && (
          <span className="text-xs text-gray-500 italic">(inactive)</span>
        )}
      </div>
    )
  }

  // Show loading state for payment method lookup
  if (paymentMethodId && loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    )
  }

  // Show fallback if payment method ID exists but couldn't be loaded
  if (paymentMethodId && !paymentMethod && !loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center text-xs">
          ⚠️
        </div>
        <span className="text-sm text-orange-600" title={`Payment method ID: ${paymentMethodId} - This payment method may have been deleted`}>
          Deleted payment method
        </span>
      </div>
    )
  }

  // Fall back to legacy payment method display
  // If both paymentMethodId and legacyPaymentMethod are missing, show a more helpful message
  if (!paymentMethodId && !legacyPaymentMethod) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-base">⚫</span>
        <span className="text-sm text-gray-500 italic">No payment method</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-base">{getLegacyIcon(legacyPaymentMethod)}</span>
      <span className="text-sm text-gray-600">{formatLegacyMethod(legacyPaymentMethod)}</span>
    </div>
  )
}

// Helper function to clear cache when payment methods are updated
export const clearPaymentMethodCache = () => {
  paymentMethodsCache = null
  cacheTime = 0
}