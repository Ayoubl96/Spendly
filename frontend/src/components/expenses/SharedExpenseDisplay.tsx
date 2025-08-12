import React, { useEffect } from 'react'
import { Users, User } from 'lucide-react'
import { Expense, ExpenseWithDetails } from '../../types/api.types'
import { useAuthStore } from '../../stores/auth.store'
import { useExpenseStore } from '../../stores/expense.store'

interface SharedExpenseDisplayProps {
  expense: Expense | ExpenseWithDetails
  showDetails?: boolean
}

export function SharedExpenseDisplay({ expense, showDetails = false }: SharedExpenseDisplayProps) {
  const { user: currentUser } = useAuthStore()
  const { users, fetchUsers } = useExpenseStore()
  
  // Ensure users are loaded when component mounts
  useEffect(() => {
    if (users.length === 0) {
      fetchUsers()
    }
  }, [users.length, fetchUsers])
  
  if (!expense.isShared) {
    return null
  }


  const expenseShares = ('expenseShares' in expense) ? expense.expenseShares || [] : []
  
  // Helper function to get user display name
  const getUserDisplayName = (userId: string) => {
    if (currentUser && userId === currentUser.id) {
      return "You"
    }
    const user = users.find(u => u.id === userId)
    return user ? `${user.firstName} ${user.lastName}` : "Unknown User"
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <Users className="h-4 w-4 text-blue-600" />
        <span className="text-blue-600 font-medium">Shared Expense</span>
        
        {expenseShares.length > 0 && (
          <>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500 text-xs">
              {expenseShares.length} participant{expenseShares.length > 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>
      
      {showDetails && expenseShares.length > 0 && (
        <div className="ml-6 space-y-1">
          {expenseShares.map((share) => {
            const isCurrentUser = currentUser && share.userId === currentUser.id
            return (
              <div key={share.id} className={`flex items-center justify-between text-xs ${isCurrentUser ? 'font-medium text-blue-600' : 'text-gray-600'}`}>
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{getUserDisplayName(share.userId)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{(typeof share.sharePercentage === 'number' ? share.sharePercentage : parseFloat(share.sharePercentage || '0')).toFixed(1)}%</span>
                  <span>{expense.currency} {(typeof share.shareAmount === 'number' ? share.shareAmount : parseFloat(share.shareAmount || '0')).toFixed(2)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
