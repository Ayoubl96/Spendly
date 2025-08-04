// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  errors?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  summary?: {
    totalAmount: number
    currency: string
    count: number
  }
}

// Authentication Types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  defaultCurrency: string
}

export interface AuthTokens {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in?: number
}

// User Types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  defaultCurrency: string
  timezone: string
  dateFormat: string
  language: string
  isActive: boolean
  emailVerified: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

// Category Types
export interface Category {
  id: string
  name: string
  parentId?: string
  userId: string
  color?: string
  icon?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CategoryTree extends Category {
  subcategories: CategoryTree[]
  expenseCount: number
  totalAmount: number
}

// Currency Types
export interface Currency {
  code: string
  name: string
  symbol: string
  decimalPlaces: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Expense Types
export interface Expense {
  id: string
  amount: number
  currency: string
  amountInBaseCurrency?: number
  exchangeRate?: number
  description: string
  expenseDate: string
  userId: string
  categoryId?: string
  subcategoryId?: string
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'other'
  receiptUrl?: string
  notes?: string
  location?: string
  vendor?: string
  isShared: boolean
  sharedWith?: string[]
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface ExpenseWithDetails extends Expense {
  category?: Category
  subcategory?: Category
  currencyInfo?: Currency
  attachments: ExpenseAttachment[]
}

export interface ExpenseAttachment {
  id: string
  expenseId: string
  filename: string
  originalFilename: string
  filePath: string
  fileSize: number
  mimeType: string
  createdAt: string
}

export interface CreateExpenseRequest {
  amount: number
  currency: string
  description: string
  expenseDate: string
  categoryId?: string
  subcategoryId?: string
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'other'
  notes?: string
  location?: string
  vendor?: string
  isShared?: boolean
  sharedWith?: string[]
  tags?: string[]
}

// Budget Types
export interface Budget {
  id: string
  name: string
  amount: number
  currency: string
  periodType: 'weekly' | 'monthly' | 'yearly' | 'custom'
  startDate: string
  endDate?: string
  userId: string
  categoryId?: string
  alertThreshold: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface BudgetPerformance {
  budgetId: string
  name: string
  amount: number
  spent: number
  remaining: number
  percentageUsed: number
  status: 'on_track' | 'warning' | 'over_budget'
  isOverBudget: boolean
  shouldAlert: boolean
  alertThreshold: number
  currency: string
  periodType: string
  startDate: string
  endDate?: string
  category?: Category
}

export interface BudgetSummary {
  totalBudget: number
  totalSpent: number
  totalRemaining: number
  overallPercentage: number
  overallStatus: 'on_track' | 'warning' | 'over_budget'
  budgetCount: number
  statusCounts: Record<string, number>
  budgets: BudgetPerformance[]
}

// Analytics Types
export interface ExpenseSummary {
  totalAmount: number
  totalCount: number
  currency: string
  periodStart: string
  periodEnd: string
  categoryBreakdown: Record<string, {
    amount: number
    count: number
    categoryId: string
  }>
  monthlyBreakdown: {
    month: number
    totalAmount: number
    totalCount: number
  }[]
}

// Filter Types
export interface ExpenseFilters {
  startDate?: string
  endDate?: string
  categoryId?: string
  currency?: string
  paymentMethod?: string
  minAmount?: number
  maxAmount?: number
  search?: string
  isShared?: boolean
  tags?: string[]
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}