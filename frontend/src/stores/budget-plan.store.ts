import { create } from 'zustand'
import { 
  MonthlyBudgetPlan,
  MonthlyBudgetPlanSummary,
  CreateMonthlyBudgetPlanRequest,
  UpdateMonthlyBudgetPlanRequest
} from '../types/budget-plan.types'
import { apiService } from '../services/api.service'

interface BudgetPlanState {
  // Data
  monthlyPlans: MonthlyBudgetPlanSummary[]
  currentPlan: MonthlyBudgetPlan | null
  
  // Loading states
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  
  // Error handling
  error: string | null
  
  // Actions
  fetchMonthlyPlans: (year?: number) => Promise<void>
  fetchMonthlyPlan: (year: number, month: number) => Promise<void>
  createMonthlyPlan: (data: CreateMonthlyBudgetPlanRequest) => Promise<MonthlyBudgetPlan>
  updateMonthlyPlan: (year: number, month: number, data: UpdateMonthlyBudgetPlanRequest) => Promise<MonthlyBudgetPlan>
  deleteMonthlyPlan: (year: number, month: number) => Promise<void>
  duplicateMonthlyPlan: (sourceYear: number, sourceMonth: number, targetYear: number, targetMonth: number) => Promise<MonthlyBudgetPlan>
  clearError: () => void
  clearCurrentPlan: () => void
}

export const useBudgetPlanStore = create<BudgetPlanState>()((set, get) => ({
  // Initial state
  monthlyPlans: [],
  currentPlan: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,

  // Actions
  fetchMonthlyPlans: async (year?: number) => {
    set({ isLoading: true, error: null })
    
    try {
      const plans = await apiService.getMonthlyBudgetPlans(year)
      set({ 
        monthlyPlans: plans, 
        isLoading: false 
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch monthly plans',
      })
    }
  },

  fetchMonthlyPlan: async (year: number, month: number) => {
    set({ isLoading: true, error: null })
    
    try {
      const plan = await apiService.getMonthlyBudgetPlan(year, month)
      set({ 
        currentPlan: plan, 
        isLoading: false 
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch monthly plan',
      })
    }
  },

  createMonthlyPlan: async (data: CreateMonthlyBudgetPlanRequest) => {
    set({ isCreating: true, error: null })
    
    try {
      const newPlan = await apiService.createMonthlyBudgetPlan(data)
      
      // Refresh the monthly plans list
      get().fetchMonthlyPlans()
      
      set({ isCreating: false })
      return newPlan
    } catch (error) {
      set({
        isCreating: false,
        error: error instanceof Error ? error.message : 'Failed to create monthly plan',
      })
      throw error
    }
  },

  updateMonthlyPlan: async (year: number, month: number, data: UpdateMonthlyBudgetPlanRequest) => {
    set({ isUpdating: true, error: null })
    
    try {
      const updatedPlan = await apiService.updateMonthlyBudgetPlan(year, month, data)
      
      // Update current plan if it matches
      const currentPlan = get().currentPlan
      if (currentPlan && currentPlan.year === year && currentPlan.month === month) {
        set({ currentPlan: updatedPlan })
      }
      
      // Refresh the monthly plans list
      get().fetchMonthlyPlans()
      
      set({ isUpdating: false })
      return updatedPlan
    } catch (error) {
      set({
        isUpdating: false,
        error: error instanceof Error ? error.message : 'Failed to update monthly plan',
      })
      throw error
    }
  },

  deleteMonthlyPlan: async (year: number, month: number) => {
    set({ isDeleting: true, error: null })
    
    try {
      await apiService.deleteMonthlyBudgetPlan(year, month)
      
      // Clear current plan if it matches the deleted one
      const currentPlan = get().currentPlan
      if (currentPlan && currentPlan.year === year && currentPlan.month === month) {
        set({ currentPlan: null })
      }
      
      // Remove from monthly plans list
      set((state) => ({
        monthlyPlans: state.monthlyPlans.filter(
          plan => !(plan.year === year && plan.month === month)
        ),
        isDeleting: false
      }))
    } catch (error) {
      set({
        isDeleting: false,
        error: error instanceof Error ? error.message : 'Failed to delete monthly plan',
      })
      throw error
    }
  },

  duplicateMonthlyPlan: async (sourceYear: number, sourceMonth: number, targetYear: number, targetMonth: number) => {
    set({ isCreating: true, error: null })
    
    try {
      // Fetch the source plan
      const sourcePlan = await apiService.getMonthlyBudgetPlan(sourceYear, sourceMonth)
      
      // Create new plan data based on source
      const MONTH_NAMES = [
        '', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]
      
      const newPlanData: CreateMonthlyBudgetPlanRequest = {
        name: `${MONTH_NAMES[targetMonth]} ${targetYear} Budget Plan`,
        month: targetMonth,
        year: targetYear,
        currency: sourcePlan.currency,
        category_budgets: sourcePlan.category_budgets.map((allocation: any) => ({
          category_id: allocation.category_id,
          budget_amount: allocation.budget_amount,
          alert_threshold: allocation.alert_threshold,
          is_active: allocation.is_active
        }))
      }
      
      // Create the new plan
      const newPlan = await apiService.createMonthlyBudgetPlan(newPlanData)
      
      // Refresh the monthly plans list
      get().fetchMonthlyPlans()
      
      set({ isCreating: false })
      return newPlan
    } catch (error) {
      set({
        isCreating: false,
        error: error instanceof Error ? error.message : 'Failed to duplicate monthly plan',
      })
      throw error
    }
  },

  clearError: () => {
    set({ error: null })
  },

  clearCurrentPlan: () => {
    set({ currentPlan: null })
  }
}))

export default useBudgetPlanStore