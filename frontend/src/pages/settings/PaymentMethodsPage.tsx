import React, { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { PaymentMethodForm } from '../../components/forms/PaymentMethodForm'
import { 
  PaymentMethodWithStats, 
  PaymentMethod,
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
  BulkPaymentMethodUpdateRequest
} from '../../types/api.types'
import apiService from '../../services/api.service'
import { clearPaymentMethodCache } from '../../components/expenses/PaymentMethodDisplay'
// Drag and drop functionality - we'll implement this with a simpler approach for now
// import { 
//   DragDropContext, 
//   Droppable, 
//   Draggable, 
//   DropResult 
// } from 'react-beautiful-dnd'

export function PaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<PaymentMethodWithStats | null>(null)

  useEffect(() => {
    loadPaymentMethods()
  }, [showInactive])

  const loadPaymentMethods = async () => {
    try {
      setLoading(true)
      const data = await apiService.getPaymentMethodsWithStats(showInactive)
      // Ensure data integrity
      const validatedData = data.map(method => ({
        ...method,
        expenseCount: method.expenseCount ?? 0,
        totalAmount: method.totalAmount ?? 0,
        lastUsed: method.lastUsed || undefined
      }))
      setPaymentMethods(validatedData)
      setError(null)
    } catch (err) {
      setError('Failed to load payment methods')
      console.error('Error loading payment methods:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFormSubmit = async (data: CreatePaymentMethodRequest | UpdatePaymentMethodRequest) => {
    try {
      if (editingMethod) {
        // Update existing payment method
        await apiService.updatePaymentMethod(editingMethod.id, data)
      } else {
        // Create new payment method - ensure we have all required fields
        const createData = data as CreatePaymentMethodRequest
        if (!createData.name) {
          throw new Error('Name is required')
        }
        await apiService.createPaymentMethod(createData)
      }
      
      await loadPaymentMethods()
      clearPaymentMethodCache() // Clear cache so expense display updates immediately
      setEditingMethod(null)
      setIsFormOpen(false)
    } catch (err) {
      console.error('Error submitting payment method:', err)
      throw err
    }
  }

  const handleDeleteMethod = async (method: PaymentMethodWithStats) => {
    setConfirmDelete(method)
  }

  const confirmDeleteMethod = async () => {
    if (!confirmDelete) return

    try {
      const force = confirmDelete.expenseCount === 0
      await apiService.deletePaymentMethod(confirmDelete.id, force)
      await loadPaymentMethods()
      clearPaymentMethodCache() // Clear cache so expense display updates immediately
      setConfirmDelete(null)
    } catch (err) {
      console.error('Error deleting payment method:', err)
      alert('Failed to delete payment method')
    }
  }

  const handleEditMethod = (method: PaymentMethod) => {
    setEditingMethod(method)
    setIsFormOpen(true)
  }

  const handleCreateDefaultMethods = async () => {
    try {
      await apiService.createDefaultPaymentMethods()
      await loadPaymentMethods()
      clearPaymentMethodCache() // Clear cache so expense display updates immediately
    } catch (err) {
      console.error('Error creating default payment methods:', err)
      alert('Failed to create default payment methods')
    }
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    
    const newMethods = [...paymentMethods]
    const [method] = newMethods.splice(index, 1)
    newMethods.splice(index - 1, 0, method)
    
    setPaymentMethods(newMethods)
    await updateSortOrders(newMethods)
  }

  const handleMoveDown = async (index: number) => {
    if (index === paymentMethods.length - 1) return
    
    const newMethods = [...paymentMethods]
    const [method] = newMethods.splice(index, 1)
    newMethods.splice(index + 1, 0, method)
    
    setPaymentMethods(newMethods)
    await updateSortOrders(newMethods)
  }

  const updateSortOrders = async (methods: PaymentMethodWithStats[]) => {
    try {
      const updates = methods.map((method, index) => ({
        id: method.id,
        sortOrder: index + 1
      }))

      const updateData: BulkPaymentMethodUpdateRequest = {
        paymentMethods: updates
      }

      await apiService.reorderPaymentMethods(updateData)
    } catch (err) {
      console.error('Error reordering payment methods:', err)
      await loadPaymentMethods()
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading payment methods...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
            <p className="text-gray-600">Manage your payment methods for tracking expenses</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? 'Hide Inactive' : 'Show Inactive'}
            </Button>
            <Button onClick={() => setIsFormOpen(true)}>
              Add Payment Method
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {paymentMethods.length === 0 && !loading && (
          <Card className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <div className="text-6xl mb-4">💳</div>
              <h3 className="text-lg font-semibold mb-2">No Payment Methods</h3>
              <p className="text-gray-600 mb-6">
                Create your first payment method to start tracking expenses
              </p>
              <div className="space-x-2">
                <Button onClick={() => setIsFormOpen(true)}>
                  Add Payment Method
                </Button>
                <Button variant="outline" onClick={handleCreateDefaultMethods}>
                  Create Default Methods
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Payment Methods List */}
        {paymentMethods.length > 0 && (
          <div className="space-y-3">
            {paymentMethods.map((method, index) => (
              <Card
                key={method.id}
                className={`p-4 ${!method.isActive ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Reorder Controls */}
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === paymentMethods.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>

                    {/* Method Info */}
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: method.color || '#3B82F6' }}
                      >
                        <span className="text-lg">
                          {getMethodIcon(method.icon)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{method.name}</h3>
                          {method.isDefault && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                          {!method.isActive && (
                            <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        {method.description && (
                          <p className="text-sm text-gray-600">{method.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span>{method.expenseCount || 0} expenses</span>
                          <span>${(method.totalAmount || 0).toFixed(2)} total</span>
                          {method.lastUsed && (
                            <span>Last: {new Date(method.lastUsed).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditMethod(method)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteMethod(method)}
                      disabled={!method.canDelete && method.expenseCount > 0}
                      className={
                        !method.canDelete && method.expenseCount > 0
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-red-50 hover:text-red-600'
                      }
                    >
                      {method.expenseCount > 0 ? 'Disable' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Payment Method Form Modal */}
        <PaymentMethodForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false)
            setEditingMethod(null)
          }}
          onSubmit={handleFormSubmit}
          editPaymentMethod={editingMethod}
        />

        {/* Confirmation Dialog */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">
                {confirmDelete.expenseCount > 0 ? 'Disable Payment Method' : 'Delete Payment Method'}
              </h3>
              <p className="text-gray-600 mb-6">
                {confirmDelete.expenseCount > 0 
                  ? `Are you sure you want to disable "${confirmDelete.name}"? This payment method is used by ${confirmDelete.expenseCount} expense(s). It will be hidden but not deleted.`
                  : `Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`
                }
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteMethod}
                >
                  {confirmDelete.expenseCount > 0 ? 'Disable' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
