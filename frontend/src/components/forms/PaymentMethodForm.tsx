import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card } from '../ui/card'
import {
  PaymentMethod,
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest
} from '../../types/api.types'

interface PaymentMethodFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreatePaymentMethodRequest | UpdatePaymentMethodRequest) => Promise<void>
  editPaymentMethod?: PaymentMethod | null
}

// Common payment method icons
const PAYMENT_METHOD_ICONS = [
  { value: 'banknote', label: 'Cash', icon: '💵' },
  { value: 'credit-card', label: 'Credit Card', icon: '💳' },
  { value: 'building-columns', label: 'Bank', icon: '🏦' },
  { value: 'smartphone', label: 'Mobile Payment', icon: '📱' },
  { value: 'wallet', label: 'Wallet', icon: '👛' },
  { value: 'university', label: 'Institution', icon: '🏛️' },
  { value: 'gift', label: 'Gift Card', icon: '🎁' },
  { value: 'coins', label: 'Coins', icon: '🪙' },
  { value: 'landmark', label: 'Financial', icon: '🏛️' },
  { value: 'ellipsis-horizontal-circle', label: 'Other', icon: '⚪' }
]

// Common colors
const PAYMENT_METHOD_COLORS = [
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6B7280'  // Gray
]

export function PaymentMethodForm({ isOpen, onClose, onSubmit, editPaymentMethod }: PaymentMethodFormProps) {
  const [formData, setFormData] = useState<CreatePaymentMethodRequest>({
    name: '',
    description: '',
    icon: 'credit-card',
    color: '#3B82F6',
    sortOrder: 0,
    isActive: true
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (editPaymentMethod) {
      setFormData({
        name: editPaymentMethod.name,
        description: editPaymentMethod.description || '',
        icon: editPaymentMethod.icon || 'credit-card',
        color: editPaymentMethod.color || '#3B82F6',
        sortOrder: editPaymentMethod.sortOrder,
        isActive: editPaymentMethod.isActive
      })
    } else {
      setFormData({
        name: '',
        description: '',
        icon: 'credit-card',
        color: '#3B82F6',
        sortOrder: 0,
        isActive: true
      })
    }
  }, [editPaymentMethod, isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked 
             : type === 'number' ? parseInt(value) || 0
             : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Error submitting payment method:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {editPaymentMethod ? 'Edit Payment Method' : 'Add Payment Method'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name *
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="e.g., My Credit Card, Cash"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Optional description"
                value={formData.description}
                onChange={handleChange}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-y"
              />
            </div>

            {/* Icon Selection */}
            <div>
              <label htmlFor="icon" className="block text-sm font-medium mb-2">
                Icon
              </label>
              <div className="grid grid-cols-5 gap-2">
                {PAYMENT_METHOD_ICONS.map((iconOption) => (
                  <button
                    key={iconOption.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, icon: iconOption.value }))}
                    className={`p-2 rounded-md border text-center hover:bg-gray-50 transition-colors ${
                      formData.icon === iconOption.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300'
                    }`}
                    title={iconOption.label}
                  >
                    <span className="text-lg">{iconOption.icon}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <label htmlFor="color" className="block text-sm font-medium mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHOD_COLORS.map((colorOption) => (
                  <button
                    key={colorOption}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color: colorOption }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === colorOption
                        ? 'border-gray-800 scale-110'
                        : 'border-gray-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: colorOption }}
                    title={colorOption}
                  />
                ))}
              </div>
              <div className="mt-2">
                <Input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  placeholder="#3B82F6"
                  className="w-24"
                />
              </div>
            </div>

            {/* Sort Order */}
            <div>
              <label htmlFor="sortOrder" className="block text-sm font-medium mb-1">
                Sort Order
              </label>
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                min="0"
                value={formData.sortOrder}
                onChange={handleChange}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <input
                id="isActive"
                name="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={handleChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium">
                Active
              </label>
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-3 bg-gray-50">
              <p className="text-sm font-medium mb-2">Preview:</p>
              <div className="flex items-center space-x-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: formData.color }}
                >
                  {PAYMENT_METHOD_ICONS.find(i => i.value === formData.icon)?.icon || '💳'}
                </div>
                <span className="font-medium">{formData.name || 'Payment Method Name'}</span>
              </div>
              {formData.description && (
                <p className="text-sm text-gray-600 mt-1">{formData.description}</p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting || !formData.name.trim()}
              >
                {isSubmitting ? 'Saving...' : editPaymentMethod ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
