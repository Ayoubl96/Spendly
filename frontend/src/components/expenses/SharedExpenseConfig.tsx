import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Users, Percent, DollarSign } from 'lucide-react'
import { ExpenseShareCreate, User } from '../../types/api.types'
import { useExpenseStore } from '../../stores/expense.store'
import { useAuthStore } from '../../stores/auth.store'

interface SharedExpenseConfigProps {
  totalAmount: number
  currency: string
  participants: ExpenseShareCreate[]
  onParticipantsChange: (participants: ExpenseShareCreate[]) => void
  disabled?: boolean
}

interface ParticipantFormData {
  userId: string
  shareType: 'percentage' | 'fixed_amount' | 'equal'
  sharePercentage: number
  customAmount: number
}

export function SharedExpenseConfig({
  totalAmount,
  currency,
  participants,
  onParticipantsChange,
  disabled = false
}: SharedExpenseConfigProps) {
  const { users, fetchUsers } = useExpenseStore()
  const { user: currentUser } = useAuthStore()
  const [localParticipants, setLocalParticipants] = useState<ParticipantFormData[]>([])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])



  useEffect(() => {
    // Only initialize from props if we don't have local participants yet
    // and props contain meaningful data
    if (localParticipants.length === 0 && participants.length > 0) {
      const formData = participants.map(p => ({
        userId: p.userId,
        shareType: p.shareType || 'percentage',
        sharePercentage: p.sharePercentage,
        customAmount: p.customAmount || 0
      }))
      setLocalParticipants(formData)
    }
  }, [participants, localParticipants.length])

  const addParticipant = () => {
    const newParticipant: ParticipantFormData = {
      userId: '',
      shareType: 'equal',
      sharePercentage: 0,
      customAmount: 0
    }
    const updated = [...localParticipants, newParticipant]
    setLocalParticipants(updated)
    
    // Use setTimeout to ensure state is updated before recalculating
    setTimeout(() => {
      recalculateShares(updated)
    }, 0)
  }

  const removeParticipant = (index: number) => {
    const updated = localParticipants.filter((_, i) => i !== index)
    setLocalParticipants(updated)
    recalculateShares(updated)
  }

  const updateParticipant = (index: number, field: keyof ParticipantFormData, value: any) => {
    const updated = [...localParticipants]
    updated[index] = { ...updated[index], [field]: value }
    setLocalParticipants(updated)
    recalculateShares(updated)
  }

  const recalculateShares = (updatedParticipants: ParticipantFormData[]) => {
    const equalShareCount = updatedParticipants.filter(p => p.shareType === 'equal').length
    const equalSharePercentage = equalShareCount > 0 ? 100 / updatedParticipants.length : 0

    const calculatedParticipants = updatedParticipants.map(p => {
      let sharePercentage = p.sharePercentage
      let shareAmount = p.customAmount

      if (p.shareType === 'equal') {
        sharePercentage = equalSharePercentage
        shareAmount = (totalAmount * sharePercentage) / 100
      } else if (p.shareType === 'fixed_amount') {
        shareAmount = p.customAmount
        sharePercentage = totalAmount > 0 ? (shareAmount / totalAmount) * 100 : 0
      } else {
        // percentage
        shareAmount = (totalAmount * sharePercentage) / 100
      }

      return {
        userId: p.userId,
        sharePercentage: Math.round(sharePercentage * 100) / 100,
        shareAmount: Math.round(shareAmount * 100) / 100,
        currency,
        shareType: p.shareType,
        customAmount: p.shareType === 'fixed_amount' ? shareAmount : undefined
      }
    }) // Include all participants, even those without selected users

    // Only pass participants with selected users to the parent, but keep all in local state
    const validParticipants = calculatedParticipants.filter(p => p.userId)
    onParticipantsChange(validParticipants)
  }

  const calculateEqualSplit = () => {
    if (localParticipants.length === 0) return

    const updated = localParticipants.map(p => ({
      ...p,
      shareType: 'equal' as const,
      sharePercentage: 100 / localParticipants.length,
      customAmount: totalAmount / localParticipants.length
    }))
    
    setLocalParticipants(updated)
    recalculateShares(updated)
  }

  const validParticipants = participants.filter(p => p.userId)
  const totalPercentage = validParticipants.reduce((sum, p) => sum + p.sharePercentage, 0)
  const totalSharedAmount = validParticipants.reduce((sum, p) => sum + p.shareAmount, 0)

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Participants & Shares</h3>
        </div>
        <div className="text-sm text-gray-600">
          Total: {currency} {totalAmount.toFixed(2)}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded border">
        <div className="text-center">
          <div className="text-sm text-gray-600">Total Percentage</div>
          <div className={`font-medium ${Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
            {totalPercentage.toFixed(1)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-600">Total Shared</div>
          <div className="font-medium text-gray-900">
            {currency} {totalSharedAmount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Participants */}
      <div className="space-y-3">
        {/* Debug: Show participant count */}
        <div className="text-xs text-gray-500">
          Debug: {localParticipants.length} participants in local state
        </div>
        {localParticipants.map((participant, index) => (
          <div key={index} className="flex items-center gap-3 p-3 bg-white rounded border">
            {/* User Selection */}
            <select
              value={participant.userId}
              onChange={(e) => updateParticipant(index, 'userId', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={disabled}
              required
            >
              <option value="">Select user...</option>
              {users.map(user => {
                const isCurrentUser = currentUser && user.id === currentUser.id
                const displayName = isCurrentUser 
                  ? `You (${user.firstName} ${user.lastName})` 
                  : `${user.firstName} ${user.lastName} (${user.email})`
                
                return (
                  <option key={user.id} value={user.id}>
                    {displayName}
                  </option>
                )
              })}
            </select>

            {/* Share Type */}
            <select
              value={participant.shareType}
              onChange={(e) => updateParticipant(index, 'shareType', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={disabled}
            >
              <option value="equal">Equal Split</option>
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed Amount</option>
            </select>

            {/* Share Value Input */}
            {participant.shareType === 'percentage' && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={participant.sharePercentage}
                  onChange={(e) => updateParticipant(index, 'sharePercentage', parseFloat(e.target.value) || 0)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={disabled}
                />
                <Percent className="h-4 w-4 text-gray-400" />
              </div>
            )}

            {participant.shareType === 'fixed_amount' && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  value={participant.customAmount}
                  onChange={(e) => updateParticipant(index, 'customAmount', parseFloat(e.target.value) || 0)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                  disabled={disabled}
                />
              </div>
            )}

            {participant.shareType === 'equal' && (
              <div className="text-sm text-gray-600 w-24 text-center">
                {(100 / localParticipants.length).toFixed(1)}%
              </div>
            )}

            {/* Remove Button */}
            <button
              type="button"
              onClick={() => removeParticipant(index)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-md"
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addParticipant}
          className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50"
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
          Add Another Person
        </button>
        
        <button
          type="button"
          onClick={calculateEqualSplit}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          disabled={disabled || localParticipants.length === 0}
        >
          Equal Split
        </button>
      </div>

      {/* Validation Warnings */}
      {Math.abs(totalPercentage - 100) > 0.01 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="text-sm text-yellow-800">
            ⚠️ Shares don't add up to 100%. Current total: {totalPercentage.toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  )
}
