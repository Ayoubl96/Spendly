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
  ExpenseSummary,
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
      body: JSON.stringify(data),
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
}

export const apiService = new ApiService()
export default apiService