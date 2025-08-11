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

export interface CreateCategoryRequest {
  name: string
  parentId?: string
  color?: string
  icon?: string
  sortOrder?: number
}

export interface UpdateCategoryRequest {
  name?: string
  parentId?: string
  color?: string
  icon?: string
  sortOrder?: number
}

export interface DeleteCategoryRequest {
  reassignToCategoryId?: string
}

export interface CategoryStats {
  category_id: string
  category_name: string
  expense_count: number
  total_amount: number
  subcategory_count: number
  can_delete: boolean
}

export interface CategoryDeleteResponse {
  message: string
  reassigned_expenses: number
  reassigned_to?: string
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

export interface ExchangeRateResponse {
  from_currency: string
  to_currency: string
  rate: number
  timestamp: string
}

export interface CurrencyConversionResponse {
  original_amount: number
  original_currency: string
  converted_amount: number
  target_currency: string
  exchange_rate: number
  conversion_date: string
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
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'other'  // Legacy
  paymentMethodId?: string  // New user payment method reference
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
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'other'  // Legacy
  paymentMethodId?: string  // New user payment method reference
  notes?: string
  location?: string
  vendor?: string
  isShared?: boolean
  sharedWith?: string[]
  tags?: string[]
  // Currency conversion fields
  amount_in_base_currency?: number
  exchange_rate?: number
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
  subcategoryId?: string
  budgetGroupId?: string
  alertThreshold: number
  is_active: boolean
  createdAt: string
  updatedAt: string
}

// Budget Group Types
export interface BudgetGroup {
  id: string
  name: string
  description?: string
  periodType: 'monthly' | 'quarterly' | 'yearly' | 'custom'
  startDate: string
  endDate: string
  currency: string
  userId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CategoryBudgetConfig {
  category_id: string
  amount: number
}

export interface CreateBudgetGroupRequest {
  name: string
  description?: string
  periodType: 'monthly' | 'quarterly' | 'yearly' | 'custom'
  startDate: string
  endDate: string
  currency: string
  // auto-generation options
  auto_create_budgets?: boolean
  category_scope?: 'primary' | 'subcategories' | 'all'
  default_amount?: number
  include_inactive_categories?: boolean
  category_configs?: CategoryBudgetConfig[]
}

export interface UpdateBudgetGroupRequest {
  name?: string
  description?: string
  periodType?: 'monthly' | 'quarterly' | 'yearly' | 'custom'
  startDate?: string
  endDate?: string
  currency?: string
  isActive?: boolean
}

export interface GenerateBudgetsRequest {
  category_scope?: 'primary' | 'subcategories' | 'all'
  default_amount?: number
  include_inactive_categories?: boolean
}

export interface BulkBudgetUpdateItem {
  budget_id?: string
  category_id?: string
  amount: number
}

export interface BulkBudgetsUpdateRequest {
  items: BulkBudgetUpdateItem[]
}

export interface CategorySummary {
  categoryId: string
  categoryName: string
  budgeted: number
  spent: number
  remaining: number
  percentage_used?: number
  subcategories: Record<string, {
    categoryId: string
    categoryName: string
    budgeted: number
    spent: number
    remaining: number
    percentage_used?: number
  }>
}

export interface BudgetGroupSummary {
  budget_group: BudgetGroup
  total_budgeted: number
  total_spent: number
  total_remaining: number
  percentage_used: number
  status: 'on_track' | 'warning' | 'over_budget'
  budget_count: number
  category_summaries: Record<string, CategorySummary>
}

export interface BudgetGroupWithBudgets extends BudgetGroup {
  budgets: Budget[]
}

export interface BudgetGroupList {
  items: BudgetGroup[]
  total: number
  active_groups: number
  current_period_groups: number
}

export interface BudgetPerformance {
  budgetId: string
  name: string
  amount: number
  spent: number
  remaining: number
  percentage_used: number
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
  total_budget: number
  total_spent: number
  total_remaining: number
  overall_percentage: number
  overall_status: 'on_track' | 'warning' | 'over_budget'
  budget_count: number
  status_counts: Record<string, number>
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
  subcategoryId?: string
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

// Expense Import Types
export interface ExpenseImportPreviewData {
  success: boolean
  expenses: ImportExpenseData[]
  summary: {
    total_transactions: number
    new_transactions: number
    duplicate_transactions: number
    total_amount: number
    currency: string
    date_range: {
      start: string
      end: string
    }
    categorization_stats: {
      rule_matches: number
      heuristic_matches: number
      no_suggestions: number
    }
  }
  error?: string
}

export interface ImportExpenseData {
  unique_id: string
  expense_date: string
  amount: number
  currency: string
  description: string
  vendor?: string
  payment_method?: 'cash' | 'card' | 'bank_transfer' | 'other'
  notes?: string
  category_id?: string
  subcategory_id?: string
  suggested_category_id?: string
  suggested_subcategory_id?: string
  suggested_category_name?: string
  suggestion_confidence: number
  suggestion_reason: string
  suggestion_source: 'rule' | 'heuristic' | 'none'
  is_duplicate: boolean
  excluded?: boolean
  create_rule?: boolean
  tags?: string[]
  raw_data?: any
}

export interface ExpenseImportResult {
  success: boolean
  imported_count: number
  error_count: number
  imported_expense_ids: string[]
  created_rule_ids: string[]
  errors: Array<{
    index: number
    error: string
    expense_data?: any
  }>
}

export interface ExpenseImportCommitRequest {
  expenses: ImportExpenseData[]
  create_rules: boolean
  generic_tags?: string[]
}

// Categorization Rule Types
export interface CategorizationRule {
  id: string
  user_id: string
  pattern: string
  pattern_type: 'contains' | 'exact' | 'regex' | 'starts_with'
  field_to_match: 'vendor' | 'description' | 'notes'
  category_id?: string
  subcategory_id?: string
  name: string
  priority: number
  is_active: boolean
  confidence: number
  times_applied: number
  last_applied_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreateCategorizationRuleRequest {
  pattern: string
  pattern_type?: 'contains' | 'exact' | 'regex' | 'starts_with'
  field_to_match?: 'vendor' | 'description' | 'notes'
  category_id?: string
  subcategory_id?: string
  name: string
  priority?: number
  is_active?: boolean
  confidence?: number
  notes?: string
}

export interface UpdateCategorizationRuleRequest {
  pattern?: string
  pattern_type?: 'contains' | 'exact' | 'regex' | 'starts_with'
  field_to_match?: 'vendor' | 'description' | 'notes'
  category_id?: string
  subcategory_id?: string
  name?: string
  priority?: number
  is_active?: boolean
  confidence?: number
  notes?: string
}

export interface CategorizationRuleStats {
  total_rules: number
  active_rules: number
  total_applications: number
  average_confidence: number
}

// Payment Method Types
export interface PaymentMethod {
  id: string
  userId: string
  name: string
  description?: string
  icon?: string
  color?: string
  sortOrder: number
  isActive: boolean
  isDefault: boolean
  canDelete: boolean
  createdAt: string
  updatedAt: string
}

export interface PaymentMethodWithStats extends PaymentMethod {
  expenseCount: number
  totalAmount: number
  lastUsed?: string
}

export interface CreatePaymentMethodRequest {
  name: string
  description?: string
  icon?: string
  color?: string
  sortOrder?: number
  isActive?: boolean
}

export interface UpdatePaymentMethodRequest {
  name?: string
  description?: string
  icon?: string
  color?: string
  sortOrder?: number
  isActive?: boolean
}

export interface BulkPaymentMethodUpdateRequest {
  paymentMethods: Array<{
    id: string
    sortOrder: number
  }>
}