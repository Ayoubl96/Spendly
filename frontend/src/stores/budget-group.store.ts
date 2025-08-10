import { create } from 'zustand'
import { 
  BudgetGroup, 
  BudgetGroupList,
  BudgetGroupSummary,
  BudgetGroupWithBudgets,
  CreateBudgetGroupRequest,
  UpdateBudgetGroupRequest,
  Budget,
  GenerateBudgetsRequest,
  BulkBudgetsUpdateRequest,
  BudgetSummary
} from '../types/api.types'
import { apiService } from '../services/api.service'

export interface BudgetGroupFilters {
  isActive?: boolean
  periodType?: string
  currency?: string
}

interface BudgetGroupState {
  BudgetSummary: BudgetSummary | null
  budgetGroups: BudgetGroup[]
  currentBudgetGroup: BudgetGroupWithBudgets | null
  budgetGroupSummary: BudgetGroupSummary | null
  budgetGroupsSummary: any | null
  selectedBudgetGroupId: string | null
  filters: BudgetGroupFilters
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchBudgetSummary: () => Promise<void>
  fetchBudgetGroups: () => Promise<void>
  fetchCurrentBudgetGroups: () => Promise<void>
  fetchBudgetGroupsSummary: (includeInactive?: boolean) => Promise<void>
  createBudgetGroup: (data: CreateBudgetGroupRequest) => Promise<BudgetGroup>
  updateBudgetGroup: (id: string, data: UpdateBudgetGroupRequest) => Promise<BudgetGroup>
  deleteBudgetGroup: (id: string) => Promise<void>
  getBudgetGroup: (id: string) => Promise<BudgetGroup>
  getBudgetGroupWithBudgets: (id: string) => Promise<BudgetGroupWithBudgets>
  getBudgetGroupSummary: (id: string) => Promise<BudgetGroupSummary>
  getBudgetGroupBudgets: (id: string) => Promise<Budget[]>
  generateBudgetsForGroup: (id: string, payload: GenerateBudgetsRequest) => Promise<number>
  bulkUpdateBudgets: (id: string, data: BulkBudgetsUpdateRequest) => Promise<number>
  setSelectedBudgetGroup: (id: string | null) => void
  setCurrentBudgetGroup: (budgetGroup: BudgetGroupWithBudgets | null) => void
  setFilters: (filters: Partial<BudgetGroupFilters>) => void
  clearFilters: () => void
  clearError: () => void
  
  // Computed getters
  getActiveBudgetGroups: () => BudgetGroup[]
  getCurrentPeriodGroups: () => BudgetGroup[]
  getBudgetGroupsByPeriod: (periodType: string) => BudgetGroup[]
}

const initialFilters: BudgetGroupFilters = {
  isActive: true
}

export const useBudgetGroupStore = create<BudgetGroupState>((set, get) => ({
  BudgetSummary: {
    total_budget: 0,
    total_spent: 0,
    total_remaining: 0,
    overall_percentage: 0,
    overall_status: 'on_track',
    budget_count: 0,
    status_counts: {},
    budgets: [],
  },
  budgetGroups: [],
  currentBudgetGroup: null,
  budgetGroupSummary: null,
  budgetGroupsSummary: null,
  selectedBudgetGroupId: null,
  filters: initialFilters,
  isLoading: false,
  error: null,

  fetchBudgetSummary: async () => {
    set({ isLoading: true, error: null })
    try {
      const summary = await apiService.getBudgetSummary()
      set({ BudgetSummary: summary })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch budget summary' })
    }
  },

  fetchBudgetGroups: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const budgetGroupList = await apiService.getBudgetGroups()
      set({ 
        budgetGroups: budgetGroupList.items, 
        isLoading: false 
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch budget groups',
      })
    }
  },

  fetchCurrentBudgetGroups: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const currentGroups = await apiService.getCurrentBudgetGroups()
      set({ 
        budgetGroups: currentGroups, 
        isLoading: false 
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch current budget groups',
      })
    }
  },

  fetchBudgetGroupsSummary: async (includeInactive = false) => {
    set({ isLoading: true, error: null })
    
    try {
      const summary = await apiService.getBudgetGroupsSummary(includeInactive)
      set({ 
        budgetGroupsSummary: summary, 
        isLoading: false 
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch budget groups summary',
      })
    }
  },

  createBudgetGroup: async (data: CreateBudgetGroupRequest) => {
    set({ isLoading: true, error: null })
    
    try {
      const newBudgetGroup = await apiService.createBudgetGroup(data)
      set((state) => ({
        budgetGroups: [newBudgetGroup, ...state.budgetGroups],
        isLoading: false,
      }))
      
      // Refresh summary after creating budget group
      get().fetchBudgetGroupsSummary()
      
      return newBudgetGroup
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create budget group',
      })
      throw error
    }
  },

  updateBudgetGroup: async (id: string, data: UpdateBudgetGroupRequest) => {
    set({ isLoading: true, error: null })
    
    try {
      const updatedBudgetGroup = await apiService.updateBudgetGroup(id, data)
      set((state) => ({
        budgetGroups: state.budgetGroups.map((bg) =>
          bg.id === id ? updatedBudgetGroup : bg
        ),
        currentBudgetGroup: state.currentBudgetGroup?.id === id ? 
          { ...state.currentBudgetGroup, ...updatedBudgetGroup } : state.currentBudgetGroup,
        isLoading: false,
      }))
      
      // Refresh summary after updating budget group
      get().fetchBudgetGroupsSummary()
      
      return updatedBudgetGroup
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update budget group',
      })
      throw error
    }
  },

  deleteBudgetGroup: async (id: string) => {
    set({ isLoading: true, error: null })
    
    try {
      await apiService.deleteBudgetGroup(id)
      set((state) => ({
        budgetGroups: state.budgetGroups.filter((bg) => bg.id !== id),
        currentBudgetGroup: state.currentBudgetGroup?.id === id ? null : state.currentBudgetGroup,
        selectedBudgetGroupId: state.selectedBudgetGroupId === id ? null : state.selectedBudgetGroupId,
        isLoading: false,
      }))
      
      // Refresh summary after deleting budget group
      get().fetchBudgetGroupsSummary()
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete budget group',
      })
      throw error
    }
  },

  getBudgetGroup: async (id: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const budgetGroup = await apiService.getBudgetGroup(id)
      set({ isLoading: false })
      return budgetGroup
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch budget group',
      })
      throw error
    }
  },

  getBudgetGroupWithBudgets: async (id: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const budgetGroupWithBudgets = await apiService.getBudgetGroupWithBudgets(id)
      console.log('🔍 API Response from getBudgetGroupWithBudgets:', budgetGroupWithBudgets)
      console.log('🔍 Response keys:', Object.keys(budgetGroupWithBudgets || {}))
      console.log('🔍 Budgets array:', budgetGroupWithBudgets?.budgets)
      console.log('🔍 Budgets length:', budgetGroupWithBudgets?.budgets?.length)
      console.log('🔍 Full response object:', JSON.stringify(budgetGroupWithBudgets, null, 2))
      set({ 
        currentBudgetGroup: budgetGroupWithBudgets,
        isLoading: false 
      })
      return budgetGroupWithBudgets
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch budget group with budgets',
      })
      throw error
    }
  },

  getBudgetGroupSummary: async (id: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const summary = await apiService.getBudgetGroupSummary(id)
      set({ 
        budgetGroupSummary: summary,
        isLoading: false 
      })
      return summary
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch budget group summary',
      })
      throw error
    }
  },

  getBudgetGroupBudgets: async (id: string) => {
    try {
      const budgets = await apiService.getBudgetGroupBudgets(id)
      return budgets
    } catch (error) {
      console.error('Failed to fetch budget group budgets:', error)
      throw error
    }
  },

  generateBudgetsForGroup: async (id: string, payload: GenerateBudgetsRequest) => {
    set({ isLoading: true, error: null })
    try {
      const { created } = await apiService.generateBudgetsForGroup(id, payload)
      // refresh current group data
      await get().getBudgetGroupWithBudgets(id)
      await get().getBudgetGroupSummary(id)
      set({ isLoading: false })
      return created
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : 'Failed to generate budgets' })
      throw error
    }
  },

  bulkUpdateBudgets: async (id: string, data: BulkBudgetsUpdateRequest) => {
    set({ isLoading: true, error: null })
    try {
      const { updated } = await apiService.bulkUpdateBudgets(id, data)
      // refresh current group data
      await get().getBudgetGroupWithBudgets(id)
      await get().getBudgetGroupSummary(id)
      set({ isLoading: false })
      return updated
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : 'Failed to update budgets' })
      throw error
    }
  },

  setSelectedBudgetGroup: (id: string | null) => {
    set({ selectedBudgetGroupId: id })
    
    // If we're selecting a budget group, fetch its details
    if (id) {
      get().getBudgetGroupWithBudgets(id)
    } else {
      set({ currentBudgetGroup: null })
    }
  },

  setCurrentBudgetGroup: (budgetGroup: BudgetGroupWithBudgets | null) => {
    set({ currentBudgetGroup: budgetGroup })
  },

  setFilters: (newFilters: Partial<BudgetGroupFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }))
    
    // Automatically fetch budget groups when filters change
    get().fetchBudgetGroups()
  },

  clearFilters: () => {
    set({
      filters: initialFilters,
    })
    get().fetchBudgetGroups()
  },

  clearError: () => {
    set({ error: null })
  },

  // Computed getters
  getActiveBudgetGroups: () => {
    const { budgetGroups } = get()
    return budgetGroups.filter(bg => bg.isActive)
  },

  getCurrentPeriodGroups: () => {
    const { budgetGroups } = get()
    const today = new Date()
    
    return budgetGroups.filter(bg => {
      if (!bg.isActive) return false
      
      const startDate = new Date(bg.startDate)
      const endDate = new Date(bg.endDate)
      
      return startDate <= today && today <= endDate
    })
  },

  getBudgetGroupsByPeriod: (periodType: string) => {
    const { budgetGroups } = get()
    return budgetGroups.filter(bg => bg.periodType === periodType && bg.isActive)
  },  
}))
