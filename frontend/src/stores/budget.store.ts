import { create } from 'zustand'
import { 
  Budget, 
  BudgetSummary,
  BudgetPerformance,
  Category,
  Currency,
} from '../types/api.types'
import { apiService } from '../services/api.service'

export interface CreateBudgetRequest {
  name: string
  amount: number
  currency: string
  periodType: 'weekly' | 'monthly' | 'yearly' | 'custom'
  startDate: string
  endDate?: string
  categoryId?: string
  budgetGroupId?: string
  alertThreshold?: number
}

export interface UpdateBudgetRequest extends Partial<CreateBudgetRequest> {
  is_active?: boolean
}

export interface BudgetFilters {
  is_active?: boolean
  periodType?: string
  categoryId?: string
  budgetGroupId?: string
  status?: 'on_track' | 'warning' | 'over_budget'
}

interface BudgetState {
  budgets: Budget[]
  currentBudget: Budget | null
  budgetSummary: BudgetSummary | null
  budgetPerformances: Record<string, BudgetPerformance>
  categories: Category[]
  currencies: Currency[]
  filters: BudgetFilters
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchBudgets: () => Promise<void>
  fetchBudgetSummary: () => Promise<void>
  createBudget: (data: CreateBudgetRequest) => Promise<Budget>
  updateBudget: (id: string, data: UpdateBudgetRequest) => Promise<Budget>
  deleteBudget: (id: string) => Promise<void>
  getBudget: (id: string) => Promise<Budget>
  getBudgetPerformance: (id: string) => Promise<BudgetPerformance>
  setCurrentBudget: (budget: Budget | null) => void
  setFilters: (filters: Partial<BudgetFilters>) => void
  clearFilters: () => void
  clearError: () => void
  
  // Computed getters
  getActiveBudgets: () => Budget[]
  getBudgetsByStatus: (status: 'on_track' | 'warning' | 'over_budget') => Budget[]
  getBudgetsByCategory: (categoryId: string) => Budget[]
  getBudgetsByGroup: (budgetGroupId: string) => Budget[]
}

const initialFilters: BudgetFilters = {
  is_active: true
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  currentBudget: null,
  budgetSummary: null,
  budgetPerformances: {},
  categories: [],
  currencies: [],
  filters: initialFilters,
  isLoading: false,
  error: null,

  fetchBudgets: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const budgets = await apiService.getBudgets()
      set({ 
        budgets, 
        isLoading: false 
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch budgets',
      })
    }
  },

  fetchBudgetSummary: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const budgetSummary = await apiService.getBudgetSummary()
      set({ 
        budgetSummary, 
        isLoading: false 
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch budget summary',
      })
    }
  },

  createBudget: async (data: CreateBudgetRequest) => {
    set({ isLoading: true, error: null })
    
    try {
      const newBudget = await apiService.createBudget(data)
      set((state) => ({
        budgets: [newBudget, ...state.budgets],
        isLoading: false,
      }))
      
      // Refresh summary after creating budget
      get().fetchBudgetSummary()
      
      return newBudget
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create budget',
      })
      throw error
    }
  },

  updateBudget: async (id: string, data: UpdateBudgetRequest) => {
    set({ isLoading: true, error: null })
    
    try {
      const updatedBudget = await apiService.updateBudget(id, data)
      set((state) => ({
        budgets: state.budgets.map((budget) =>
          budget.id === id ? updatedBudget : budget
        ),
        currentBudget: state.currentBudget?.id === id ? updatedBudget : state.currentBudget,
        isLoading: false,
      }))
      
      // Refresh summary after updating budget
      get().fetchBudgetSummary()
      
      return updatedBudget
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update budget',
      })
      throw error
    }
  },

  deleteBudget: async (id: string) => {
    set({ isLoading: true, error: null })
    
    try {
      await apiService.deleteBudget(id)
      set((state) => ({
        budgets: state.budgets.filter((budget) => budget.id !== id),
        currentBudget: state.currentBudget?.id === id ? null : state.currentBudget,
        budgetPerformances: Object.fromEntries(
          Object.entries(state.budgetPerformances).filter(([key]) => key !== id)
        ),
        isLoading: false,
      }))
      
      // Refresh summary after deleting budget
      get().fetchBudgetSummary()
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete budget',
      })
      throw error
    }
  },

  getBudget: async (id: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const budget = await apiService.getBudget(id)
      set({ 
        currentBudget: budget,
        isLoading: false 
      })
      return budget
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch budget',
      })
      throw error
    }
  },

  getBudgetPerformance: async (id: string) => {
    try {
      const performance = await apiService.getBudgetPerformance(id)
      set((state) => ({
        budgetPerformances: {
          ...state.budgetPerformances,
          [id]: performance
        }
      }))
      return performance
    } catch (error) {
      console.error('Failed to fetch budget performance:', error)
      throw error
    }
  },

  setCurrentBudget: (budget: Budget | null) => {
    set({ currentBudget: budget })
  },

  setFilters: (newFilters: Partial<BudgetFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }))
    
    // Automatically fetch budgets when filters change
    get().fetchBudgets()
  },

  clearFilters: () => {
    set({
      filters: initialFilters,
    })
    get().fetchBudgets()
  },

  clearError: () => {
    set({ error: null })
  },

  // Computed getters
  getActiveBudgets: () => {
    const { budgets } = get()
    return budgets.filter(budget => budget.is_active)
  },

  getBudgetsByStatus: (status: 'on_track' | 'warning' | 'over_budget') => {
    const { budgets, budgetPerformances } = get()
    return budgets.filter(budget => {
      const performance = budgetPerformances[budget.id]
      return performance?.status === status
    })
  },

  getBudgetsByCategory: (categoryId: string) => {
    const { budgets } = get()
    return budgets.filter(budget => budget.categoryId === categoryId)
  },

  getBudgetsByGroup: (budgetGroupId: string) => {
    const { budgets } = get()
    return budgets.filter(budget => budget.budgetGroupId === budgetGroupId)
  },
}))