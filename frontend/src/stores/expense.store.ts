import { create } from 'zustand'
import { 
  Expense, 
  CreateExpenseRequest, 
  ExpenseFilters, 
  PaginationParams,
  Category,
  CategoryTree,
  Currency,
  User,
  ExpenseSummary,
  CreateCategoryRequest,
  UpdateCategoryRequest
} from '../types/api.types'
import { apiService } from '../services/api.service'

interface ExpenseState {
  expenses: Expense[]
  categories: Category[]
  categoryTree: CategoryTree[]
  currencies: Currency[]
  users: User[]
  currentExpense: Expense | null
  filters: ExpenseFilters
  pagination: PaginationParams
  isLoading: boolean
  error: string | null
  
  // Computed values
  totalAmount: number
  
  // Actions
  fetchExpenses: () => Promise<void>
  createExpense: (data: CreateExpenseRequest) => Promise<void>
  updateExpense: (id: string, data: Partial<CreateExpenseRequest>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  setCurrentExpense: (expense: Expense | null) => void
  setFilters: (filters: Partial<ExpenseFilters>) => void
  setPagination: (pagination: Partial<PaginationParams>) => void
  clearFilters: () => void
  fetchCategories: () => Promise<void>
  fetchCategoryTree: () => Promise<void>
  fetchCurrencies: () => Promise<void>
  fetchUsers: () => Promise<void>
  getExpenseSummary: (year: number, month: number) => Promise<ExpenseSummary>
  clearError: () => void
}

const initialFilters: ExpenseFilters = {}
const initialPagination: PaginationParams = {
  page: 1,
  limit: 20,
  sortBy: 'expenseDate',
  sortOrder: 'desc',
}

// Helper function to calculate total amount - sum all amountInBaseCurrency values
const calculateTotalAmount = (expenses: Expense[]): number => {
  return expenses.reduce((sum, expense) => {
    const amount = expense.amountInBaseCurrency || 0
    return sum + (typeof amount === 'string' ? parseFloat(amount) : amount)
  }, 0)
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  categories: [],
  categoryTree: [],
  currencies: [],
  users: [],
  currentExpense: null,
  filters: initialFilters,
  pagination: initialPagination,
  isLoading: false,
  error: null,
  totalAmount: 0,

  fetchExpenses: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const { filters, pagination } = get()
      const expenses = await apiService.getExpenses(filters, pagination)
      set({ 
        expenses, 
        totalAmount: calculateTotalAmount(expenses),
        isLoading: false 
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch expenses',
      })
    }
  },

  createExpense: async (data: CreateExpenseRequest) => {
    set({ isLoading: true, error: null })
    
    try {
      const newExpense = await apiService.createExpense(data)
      set((state) => {
        const updatedExpenses = [newExpense, ...state.expenses]
        return {
          expenses: updatedExpenses,
          totalAmount: calculateTotalAmount(updatedExpenses),
          isLoading: false,
        }
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create expense',
      })
      throw error
    }
  },

  updateExpense: async (id: string, data: Partial<CreateExpenseRequest>) => {
    set({ isLoading: true, error: null })
    
    try {
      const updatedExpense = await apiService.updateExpense(id, data)
      set((state) => {
        const updatedExpenses = state.expenses.map((expense) =>
          expense.id === id ? updatedExpense : expense
        )
        return {
          expenses: updatedExpenses,
          totalAmount: calculateTotalAmount(updatedExpenses),
          currentExpense: state.currentExpense?.id === id ? updatedExpense : state.currentExpense,
          isLoading: false,
        }
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update expense',
      })
      throw error
    }
  },

  deleteExpense: async (id: string) => {
    set({ isLoading: true, error: null })
    
    try {
      await apiService.deleteExpense(id)
      set((state) => {
        const updatedExpenses = state.expenses.filter((expense) => expense.id !== id)
        return {
          expenses: updatedExpenses,
          totalAmount: calculateTotalAmount(updatedExpenses),
          currentExpense: state.currentExpense?.id === id ? null : state.currentExpense,
          isLoading: false,
        }
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete expense',
      })
      throw error
    }
  },

  setCurrentExpense: (expense: Expense | null) => {
    set({ currentExpense: expense })
  },

  setFilters: (newFilters: Partial<ExpenseFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 }, // Reset to first page
    }))
    
    // Automatically fetch expenses when filters change
    get().fetchExpenses()
  },

  setPagination: (newPagination: Partial<PaginationParams>) => {
    set((state) => ({
      pagination: { ...state.pagination, ...newPagination },
    }))
    
    // Automatically fetch expenses when pagination changes
    get().fetchExpenses()
  },

  clearFilters: () => {
    set({
      filters: initialFilters,
      pagination: initialPagination,
    })
    get().fetchExpenses()
  },

  fetchCategories: async () => {
    try {
      const categories = await apiService.getCategories()
      set({ categories })
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  },

  fetchCategoryTree: async () => {
    try {
      const categoryTree = await apiService.getCategoryTree()
      set({ categoryTree })
    } catch (error) {
      console.error('Failed to fetch category tree:', error)
    }
  },

  fetchCurrencies: async () => {
    try {
      const currencies = await apiService.getCurrencies()
      set({ currencies })
    } catch (error) {
      console.error('Failed to fetch currencies:', error)
    }
  },

  fetchUsers: async () => {
    try {
      const users = await apiService.getUsers()
      set({ users })
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  },

  getExpenseSummary: async (year: number, month: number) => {
    try {
      return await apiService.getExpenseSummary(year, month)
    } catch (error) {
      console.error('Failed to fetch expense summary:', error)
      throw error
    }
  },

  clearError: () => {
    set({ error: null })
  },

  // Category management methods
  createCategory: async (data: CreateCategoryRequest) => {
    try {
      const newCategory = await apiService.createCategory(data)
      // Refresh category tree after creating
      const categoryTree = await apiService.getCategoryTree()
      set({ categoryTree })
      return newCategory
    } catch (error) {
      console.error('Failed to create category:', error)
      throw error
    }
  },

  updateCategory: async (id: string, data: UpdateCategoryRequest) => {
    try {
      const updatedCategory = await apiService.updateCategory(id, data)
      // Refresh category tree after updating
      const categoryTree = await apiService.getCategoryTree()
      set({ categoryTree })
      return updatedCategory
    } catch (error) {
      console.error('Failed to update category:', error)
      throw error
    }
  },

  deleteCategory: async (id: string, reassignToCategoryId?: string) => {
    try {
      const result = await apiService.deleteCategory(id, reassignToCategoryId)
      // Refresh category tree after deleting
      const categoryTree = await apiService.getCategoryTree()
      set({ categoryTree })
      return result
    } catch (error) {
      console.error('Failed to delete category:', error)
      throw error
    }
  },

  getCategoryStats: async (id: string) => {
    try {
      return await apiService.getCategoryStats(id)
    } catch (error) {
      console.error('Failed to get category stats:', error)
      throw error
    }
  },

  reorderCategories: async (categoryOrders: { id: string; sort_order: number }[]) => {
    try {
      const result = await apiService.reorderCategories(categoryOrders)
      // Refresh category tree after reordering
      const categoryTree = await apiService.getCategoryTree()
      set({ categoryTree })
      return result
    } catch (error) {
      console.error('Failed to reorder categories:', error)
      throw error
    }
  },
}))