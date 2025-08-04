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
  Budget,
  BudgetSummary,
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
  async getExpenses(
    filters: ExpenseFilters = {},
    pagination: PaginationParams = {}
  ): Promise<Expense[]> {
    const params = new URLSearchParams()
    
    if (filters.startDate) params.append('start_date', filters.startDate)
    if (filters.endDate) params.append('end_date', filters.endDate)
    if (filters.categoryId) params.append('category_id', filters.categoryId)
    if (filters.currency) params.append('currency', filters.currency)
    if (filters.search) params.append('search', filters.search)
    if (pagination.page) params.append('page', pagination.page.toString())
    if (pagination.limit) params.append('limit', pagination.limit.toString())
    if (pagination.sortBy) params.append('sort_by', pagination.sortBy)
    if (pagination.sortOrder) params.append('sort_order', pagination.sortOrder)

    const queryString = params.toString()
    return this.request<Expense[]>(`/expenses${queryString ? `?${queryString}` : ''}`)
  }

  async getExpense(id: string): Promise<Expense> {
    return this.request<Expense>(`/expenses/${id}`)
  }

  async createExpense(data: CreateExpenseRequest): Promise<Expense> {
    return this.request<Expense>('/expenses/', {
      method: 'POST',
      body: JSON.stringify({
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        expense_date: data.expenseDate,
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
  }

  async updateExpense(id: string, data: Partial<CreateExpenseRequest>): Promise<Expense> {
    return this.request<Expense>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
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

  // Currency endpoints
  async getCurrencies(): Promise<Currency[]> {
    return this.request<Currency[]>('/currencies/')
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

  // Analytics endpoints
  async getAnalyticsSummary(year: number): Promise<{ yearly_expenses: any; budget_performance: BudgetSummary }> {
    return this.request(`/analytics/summary?year=${year}`)
  }
}

export const apiService = new ApiService()
export default apiService