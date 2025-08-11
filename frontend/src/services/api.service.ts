import {
  ApiResponse,
  PaginatedResponse,
  LoginRequest,
  RegisterRequest,
  AuthTokens,
  User,
  Expense,
  CreateExpenseRequest,
  ExpenseFilters,
  PaginationParams,
  Category,
  CategoryTree,
  Currency,
  ExchangeRateResponse,
  CurrencyConversionResponse,
  Budget,
  BudgetSummary,
  BudgetPerformance,
  BudgetGroup,
  BudgetGroupList,
  BudgetGroupSummary,
  BudgetGroupWithBudgets,
  CreateBudgetGroupRequest,
  UpdateBudgetGroupRequest,
  GenerateBudgetsRequest,
  BulkBudgetsUpdateRequest,
  ExpenseSummary,
  ExpenseImportPreviewData,
  ExpenseImportResult,
  ExpenseImportCommitRequest,
  CategorizationRule,
  CreateCategorizationRuleRequest,
  UpdateCategorizationRuleRequest,
  CategorizationRuleStats,
  PaymentMethod,
  PaymentMethodWithStats,
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
  BulkPaymentMethodUpdateRequest
} from '../types/api.types'

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

class ApiService {
  private baseURL: string
  private authToken: string | null = null

  constructor() {
    this.baseURL = API_BASE_URL
    this.authToken = localStorage.getItem('authToken')
  }

  setAuthToken(token: string) {
    this.authToken = token
    localStorage.setItem('authToken', token)
  }

  clearAuthToken() {
    this.authToken = null
    localStorage.removeItem('authToken')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      if (response.status === 401) {
        this.clearAuthToken()
        window.location.href = '/login'
        throw new Error('Unauthorized')
      }
      
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Authentication endpoints
  async login(data: LoginRequest): Promise<AuthTokens & { user: User }> {
    const formData = new FormData()
    formData.append('username', data.email)
    formData.append('password', data.password)

    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || 'Login failed')
    }

    const result = await response.json()
    this.setAuthToken(result.access_token)
    
    // Get user info after login
    const user = await this.getCurrentUser()
    
    return {
      ...result,
      user,
    }
  }

  async register(data: RegisterRequest): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        first_name: data.firstName,
        last_name: data.lastName,
        default_currency: data.defaultCurrency,
      }),
    })
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    return this.request<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' })
    this.clearAuthToken()
  }

  // User endpoints
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/users/')
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/users/me')
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return this.request<User>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Expense endpoints
  // Helper function to convert snake_case fields to camelCase
  private mapExpenseFields(expense: any): Expense {
    return {
      ...expense,
      amountInBaseCurrency: expense.amount_in_base_currency,
      exchangeRate: expense.exchange_rate,
      expenseDate: expense.expense_date,
      userId: expense.user_id,
      categoryId: expense.category_id,
      subcategoryId: expense.subcategory_id,
      paymentMethod: expense.payment_method,
      paymentMethodId: expense.payment_method_id,
      receiptUrl: expense.receipt_url,
      isShared: expense.is_shared,
      sharedWith: expense.shared_with,
      createdAt: expense.created_at,
      updatedAt: expense.updated_at
    }
  }

  async getExpenses(
    filters: ExpenseFilters = {},
    pagination: PaginationParams = {}
  ): Promise<Expense[]> {
    const params = new URLSearchParams()
    
    if (filters.startDate) params.append('start_date', filters.startDate)
    if (filters.endDate) params.append('end_date', filters.endDate)
    if (filters.categoryId) params.append('category_id', filters.categoryId)
    if (filters.subcategoryId) params.append('subcategory_id', filters.subcategoryId)
    if (filters.currency) params.append('currency', filters.currency)
    if (filters.search) params.append('search', filters.search)
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => params.append('tags', tag))
    }
    if (pagination.page) params.append('page', pagination.page.toString())
    if (pagination.limit) params.append('limit', pagination.limit.toString())
    if (pagination.sortBy) params.append('sort_by', pagination.sortBy)
    if (pagination.sortOrder) params.append('sort_order', pagination.sortOrder)

    const queryString = params.toString()
    const rawExpenses = await this.request<any[]>(`/expenses/${queryString ? `?${queryString}` : ''}`)
    return rawExpenses.map(expense => this.mapExpenseFields(expense))
  }

  async getExpense(id: string): Promise<Expense> {
    const rawExpense = await this.request<any>(`/expenses/${id}`)
    return this.mapExpenseFields(rawExpense)
  }

  async createExpense(data: CreateExpenseRequest): Promise<Expense> {
    const rawExpense = await this.request<any>('/expenses/', {
      method: 'POST',
      body: JSON.stringify({
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        expense_date: data.expenseDate,
        amount_in_base_currency: data.amount_in_base_currency,
        exchange_rate: data.exchange_rate,
        category_id: data.categoryId,
        subcategory_id: data.subcategoryId,
        payment_method: data.paymentMethod,
        payment_method_id: data.paymentMethodId,
        notes: data.notes,
        location: data.location,
        vendor: data.vendor,
        is_shared: data.isShared,
        shared_with: data.sharedWith,
        tags: data.tags,
      }),
    })
    return this.mapExpenseFields(rawExpense)
  }

  async updateExpense(id: string, data: Partial<CreateExpenseRequest>): Promise<Expense> {
    const rawExpense = await this.request<any>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        expense_date: data.expenseDate,
        amount_in_base_currency: data.amount_in_base_currency,
        exchange_rate: data.exchange_rate,
        category_id: data.categoryId,
        subcategory_id: data.subcategoryId,
        payment_method: data.paymentMethod,
        payment_method_id: data.paymentMethodId,
        notes: data.notes,
        location: data.location,
        vendor: data.vendor,
        is_shared: data.isShared,
        shared_with: data.sharedWith,
        tags: data.tags,
      }),
    })
    return this.mapExpenseFields(rawExpense)
  }

  async deleteExpense(id: string): Promise<void> {
    await this.request(`/expenses/${id}`, { method: 'DELETE' })
  }

  async getExpenseSummary(year: number, month: number): Promise<ExpenseSummary> {
    return this.request<ExpenseSummary>(`/expenses/summary/monthly?year=${year}&month=${month}`)
  }

  // Category endpoints
  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/categories/')
  }

  async getCategoryTree(): Promise<CategoryTree[]> {
    return this.request<CategoryTree[]>('/categories/tree')
  }

  async createCategory(data: { name: string; parentId?: string; color?: string; icon?: string }): Promise<Category> {
    return this.request<Category>('/categories/', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        parent_id: data.parentId,
        color: data.color,
        icon: data.icon,
      }),
    })
  }

  async updateCategory(id: string, data: { name?: string; parentId?: string; color?: string; icon?: string; sortOrder?: number }): Promise<Category> {
    return this.request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: data.name,
        parent_id: data.parentId,
        color: data.color,
        icon: data.icon,
        sort_order: data.sortOrder,
      }),
    })
  }

  async deleteCategory(id: string, reassignToCategoryId?: string): Promise<{ message: string; reassigned_expenses: number; reassigned_to?: string }> {
    const params = new URLSearchParams()
    if (reassignToCategoryId) {
      params.append('reassign_to_category_id', reassignToCategoryId)
    }
    
    return this.request<{ message: string; reassigned_expenses: number; reassigned_to?: string }>(
      `/categories/${id}${params.toString() ? `?${params.toString()}` : ''}`, 
      {
        method: 'DELETE',
      }
    )
  }

  async getCategoryStats(id: string): Promise<{ category_id: string; category_name: string; expense_count: number; total_amount: number; subcategory_count: number; can_delete: boolean }> {
    return this.request<{ category_id: string; category_name: string; expense_count: number; total_amount: number; subcategory_count: number; can_delete: boolean }>(`/categories/${id}/stats`)
  }

  async reorderCategories(categoryOrders: { id: string; sort_order: number }[]): Promise<{ message: string; updated_count: number }> {
    return this.request<{ message: string; updated_count: number }>('/categories/reorder', {
      method: 'POST',
      body: JSON.stringify(categoryOrders),
    })
  }

  // Currency endpoints
  async getCurrencies(): Promise<Currency[]> {
    return this.request<Currency[]>('/currencies/')
  }

  async getExchangeRate(fromCurrency: string, toCurrency: string, forceRefresh = false): Promise<ExchangeRateResponse> {
    const params = new URLSearchParams()
    if (forceRefresh) params.append('force_refresh', 'true')
    
    return this.request<ExchangeRateResponse>(
      `/currencies/exchange-rate/${fromCurrency}/${toCurrency}${params.toString() ? `?${params.toString()}` : ''}`
    )
  }

  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<CurrencyConversionResponse> {
    return this.request<CurrencyConversionResponse>('/currencies/convert', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        from_currency: fromCurrency,
        to_currency: toCurrency,
      }),
    })
  }

  // Budget endpoints
  async getBudgets(): Promise<Budget[]> {
    return this.request<Budget[]>('/budgets/')
  }

  async getBudgetSummary(): Promise<BudgetSummary> {
    return this.request<BudgetSummary>('/budgets/summary')
  }

  async createBudget(data: {
    name: string
    amount: number
    currency: string
    periodType: string
    startDate: string
    endDate?: string
    categoryId?: string
    budgetGroupId?: string
    alertThreshold?: number
  }): Promise<Budget> {
    return this.request<Budget>('/budgets/', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        amount: data.amount,
        currency: data.currency,
        period_type: data.periodType,
        start_date: data.startDate,
        end_date: data.endDate,
        category_id: data.categoryId,
        budget_group_id: data.budgetGroupId,
        alert_threshold: data.alertThreshold || 80,
      }),
    })
  }

  async updateBudget(budgetId: string, data: {
    name?: string
    amount?: number
    currency?: string
    periodType?: string
    startDate?: string
    endDate?: string
    categoryId?: string
    budgetGroupId?: string
    alertThreshold?: number
    isActive?: boolean
  }): Promise<Budget> {
    return this.request<Budget>(`/budgets/${budgetId}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: data.name,
        amount: data.amount,
        currency: data.currency,
        period_type: data.periodType,
        start_date: data.startDate,
        end_date: data.endDate,
        category_id: data.categoryId,
        budget_group_id: data.budgetGroupId,
        alert_threshold: data.alertThreshold,
        is_active: data.isActive,
      }),
    })
  }

  async deleteBudget(budgetId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/budgets/${budgetId}`, {
      method: 'DELETE',
    })
  }

  async getBudget(budgetId: string): Promise<Budget> {
    return this.request<Budget>(`/budgets/${budgetId}`)
  }

  async getBudgetPerformance(budgetId: string): Promise<BudgetPerformance> {
    return this.request<BudgetPerformance>(`/budgets/${budgetId}/performance`)
  }

  // Budget Group endpoints
  async getBudgetGroups(): Promise<BudgetGroupList> {
    return this.request<BudgetGroupList>('/budget-groups/')
  }

  async getCurrentBudgetGroups(): Promise<BudgetGroup[]> {
    return this.request<BudgetGroup[]>('/budget-groups/current')
  }

  async getBudgetGroupsSummary(includeInactive = false): Promise<any> {
    return this.request(`/budget-groups/summary?include_inactive=${includeInactive}`)
  }

  async createBudgetGroup(data: CreateBudgetGroupRequest): Promise<BudgetGroup> {
    return this.request<BudgetGroup>('/budget-groups/', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        period_type: data.periodType,
        start_date: data.startDate,
        end_date: data.endDate,
        currency: data.currency,
        is_active: true,
        auto_create_budgets: data.auto_create_budgets ?? true,
        category_scope: data.category_scope ?? 'all',
        default_amount: data.default_amount ?? 0,
        include_inactive_categories: data.include_inactive_categories ?? false,
        category_configs: data.category_configs ?? [],
      }),
    })
  }

  async getBudgetGroup(budgetGroupId: string): Promise<BudgetGroup> {
    return this.request<BudgetGroup>(`/budget-groups/${budgetGroupId}`)
  }

  async getBudgetGroupWithBudgets(budgetGroupId: string): Promise<BudgetGroupWithBudgets> {
    return this.request<BudgetGroupWithBudgets>(`/budget-groups/${budgetGroupId}/with-budgets`)
  }

  async getBudgetGroupSummary(budgetGroupId: string): Promise<BudgetGroupSummary> {
    return this.request<BudgetGroupSummary>(`/budget-groups/${budgetGroupId}/summary`)
  }

  async getBudgetGroupBudgets(budgetGroupId: string): Promise<Budget[]> {
    return this.request<Budget[]>(`/budget-groups/${budgetGroupId}/budgets`)
  }

  async updateBudgetGroup(budgetGroupId: string, data: UpdateBudgetGroupRequest): Promise<BudgetGroup> {
    return this.request<BudgetGroup>(`/budget-groups/${budgetGroupId}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        period_type: data.periodType,
        start_date: data.startDate,
        end_date: data.endDate,
        currency: data.currency,
        is_active: data.isActive,
      }),
    })
  }

  async deleteBudgetGroup(budgetGroupId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/budget-groups/${budgetGroupId}`, {
      method: 'DELETE',
    })
  }

  async generateBudgetsForGroup(budgetGroupId: string, data: GenerateBudgetsRequest): Promise<{ created: number }> {
    return this.request<{ created: number }>(`/budget-groups/${budgetGroupId}/generate-budgets`, {
      method: 'POST',
      body: JSON.stringify({
        category_scope: data.category_scope ?? 'all',
        default_amount: data.default_amount ?? 0,
        include_inactive_categories: data.include_inactive_categories ?? false,
      }),
    })
  }

  async bulkUpdateBudgets(budgetGroupId: string, data: BulkBudgetsUpdateRequest): Promise<{ updated: number }> {
    return this.request<{ updated: number }>(`/budget-groups/${budgetGroupId}/bulk-update-budgets`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Analytics endpoints
  async getAnalyticsSummary(year: number): Promise<{ yearly_expenses: any; budget_performance: BudgetSummary }> {
    return this.request(`/analytics/summary?year=${year}`)
  }

  // Monthly Budget Plan endpoints
  async createMonthlyBudgetPlan(data: any): Promise<any> {
    return this.request('/budget-plans/', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getMonthlyBudgetPlans(year?: number): Promise<any[]> {
    const params = year ? `?year=${year}` : ''
    return this.request(`/budget-plans/${params}`)
  }

  async getMonthlyBudgetPlan(year: number, month: number): Promise<any> {
    return this.request(`/budget-plans/${year}/${month}`)
  }

  async updateMonthlyBudgetPlan(year: number, month: number, data: any): Promise<any> {
    return this.request(`/budget-plans/${year}/${month}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteMonthlyBudgetPlan(year: number, month: number): Promise<void> {
    return this.request(`/budget-plans/${year}/${month}`, {
      method: 'DELETE'
    })
  }

  // Expense Import endpoints
  async previewExpenseImport(file: File): Promise<ExpenseImportPreviewData> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseURL}/expense-import/preview`, {
      method: 'POST',
      headers: {
        'Authorization': this.authToken ? `Bearer ${this.authToken}` : ''
      },
      body: formData
    })

    if (!response.ok) {
      if (response.status === 401) {
        this.clearAuthToken()
        window.location.href = '/login'
        throw new Error('Unauthorized')
      }
      
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async commitExpenseImport(data: ExpenseImportCommitRequest): Promise<ExpenseImportResult> {
    return this.request<ExpenseImportResult>('/expense-import/commit', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // Categorization Rule endpoints
  async getCategorizationRules(isActive?: boolean): Promise<CategorizationRule[]> {
    const params = new URLSearchParams()
    if (isActive !== undefined) params.append('is_active', isActive.toString())
    
    return this.request<CategorizationRule[]>(`/expense-import/rules${params.toString() ? `?${params.toString()}` : ''}`)
  }

  async createCategorizationRule(data: CreateCategorizationRuleRequest): Promise<CategorizationRule> {
    return this.request<CategorizationRule>('/expense-import/rules', {
      method: 'POST',
      body: JSON.stringify({
        pattern: data.pattern,
        pattern_type: data.pattern_type || 'contains',
        field_to_match: data.field_to_match || 'vendor',
        category_id: data.category_id,
        subcategory_id: data.subcategory_id,
        name: data.name,
        priority: data.priority || 100,
        is_active: data.is_active !== false,
        confidence: data.confidence || 90,
        notes: data.notes
      })
    })
  }

  async updateCategorizationRule(ruleId: string, data: UpdateCategorizationRuleRequest): Promise<CategorizationRule> {
    return this.request<CategorizationRule>(`/expense-import/rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify({
        pattern: data.pattern,
        pattern_type: data.pattern_type,
        field_to_match: data.field_to_match,
        category_id: data.category_id,
        subcategory_id: data.subcategory_id,
        name: data.name,
        priority: data.priority,
        is_active: data.is_active,
        confidence: data.confidence,
        notes: data.notes
      })
    })
  }

  async deleteCategorizationRule(ruleId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/expense-import/rules/${ruleId}`, {
      method: 'DELETE'
    })
  }

  async getCategorizationRuleStats(): Promise<CategorizationRuleStats> {
    return this.request<CategorizationRuleStats>('/expense-import/rules/stats')
  }

  // Payment Methods
  // Helper function to convert snake_case fields to camelCase for payment methods
  private mapPaymentMethodFields(pm: any): PaymentMethod {
    return {
      ...pm,
      userId: pm.user_id,
      sortOrder: pm.sort_order,
      isActive: pm.is_active,
      isDefault: pm.is_default,
      canDelete: pm.can_delete,
      createdAt: pm.created_at,
      updatedAt: pm.updated_at
    }
  }

  private mapPaymentMethodWithStatsFields(pm: any): PaymentMethodWithStats {
    return {
      ...this.mapPaymentMethodFields(pm),
      expenseCount: pm.expense_count,
      totalAmount: pm.total_amount,
      lastUsed: pm.last_used
    }
  }

  async getPaymentMethods(includeInactive?: boolean): Promise<PaymentMethod[]> {
    const params = includeInactive ? '?include_inactive=true' : ''
    const rawPaymentMethods = await this.request<any[]>(`/payment-methods${params}`)
    return rawPaymentMethods.map(pm => this.mapPaymentMethodFields(pm))
  }

  async getPaymentMethodsWithStats(includeInactive?: boolean): Promise<PaymentMethodWithStats[]> {
    const params = includeInactive ? '?include_inactive=true' : ''
    const rawPaymentMethods = await this.request<any[]>(`/payment-methods/with-stats${params}`)
    return rawPaymentMethods.map(pm => this.mapPaymentMethodWithStatsFields(pm))
  }

  async createPaymentMethod(data: CreatePaymentMethodRequest): Promise<PaymentMethod> {
    const rawPaymentMethod = await this.request<any>('/payment-methods', {
      method: 'POST',
      body: JSON.stringify(data)
    })
    return this.mapPaymentMethodFields(rawPaymentMethod)
  }

  async updatePaymentMethod(id: string, data: UpdatePaymentMethodRequest): Promise<PaymentMethod> {
    const rawPaymentMethod = await this.request<any>(`/payment-methods/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
    return this.mapPaymentMethodFields(rawPaymentMethod)
  }

  async deletePaymentMethod(id: string, force?: boolean): Promise<{ message: string }> {
    const params = force ? '?force=true' : ''
    return this.request<{ message: string }>(`/payment-methods/${id}${params}`, {
      method: 'DELETE'
    })
  }

  async reorderPaymentMethods(data: BulkPaymentMethodUpdateRequest): Promise<PaymentMethod[]> {
    const rawPaymentMethods = await this.request<any[]>('/payment-methods/reorder', {
      method: 'POST',
      body: JSON.stringify({
        payment_methods: data.paymentMethods.map(pm => ({
          id: pm.id,
          sort_order: pm.sortOrder
        }))
      })
    })
    return rawPaymentMethods.map(pm => this.mapPaymentMethodFields(pm))
  }

  async createDefaultPaymentMethods(): Promise<PaymentMethod[]> {
    const rawPaymentMethods = await this.request<any[]>('/payment-methods/create-defaults', {
      method: 'POST'
    })
    return rawPaymentMethods.map(pm => this.mapPaymentMethodFields(pm))
  }
}

export const apiService = new ApiService()
export default apiService