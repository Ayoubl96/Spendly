/**
 * Types for Monthly Budget Plan functionality
 * This provides a unified interface for managing multiple category budgets
 * while maintaining granular Budget records in the backend
 * Updated: Fixed field name consistency
 */

export interface MonthlyBudgetPlan {
  id?: string
  name: string // e.g., "March 2025 Budget Plan"
  month: number // 1-12
  year: number
  currency: string
  totalAmount: number
  categoryBudgets: CategoryBudgetAllocation[]
  createdAt?: string
  updatedAt?: string
}

export interface CategoryBudgetAllocation {
  category_id: string
  category_name: string
  parent_category_id?: string
  parent_category_name?: string
  budget_amount: number
  alert_threshold: number
  is_active: boolean
  // These will be populated after creation/fetching
  budget_id?: string // Reference to the actual Budget record
  spent?: number
  remaining?: number
  percentage_used?: number
  status?: 'on_track' | 'warning' | 'over_budget'
}

export interface CategoryBudgetCreate {
  category_id: string
  budget_amount: number
  alert_threshold: number
  is_active: boolean
}

export interface CreateMonthlyBudgetPlanRequest {
  name: string
  month: number
  year: number
  currency: string
  category_budgets: CategoryBudgetCreate[]
}

export interface UpdateMonthlyBudgetPlanRequest extends Partial<CreateMonthlyBudgetPlanRequest> {
  id: string
}

export interface MonthlyBudgetPlanSummary {
  plan_id: string
  name: string
  month: number
  year: number
  currency: string
  total_budget: number
  total_spent: number
  total_remaining: number
  overall_percentage: number
  overall_status: 'on_track' | 'warning' | 'over_budget'
  category_count: number
  active_budget_count: number
}

// Helper types for the UI
export interface BudgetPlanFormData {
  name: string
  month: number
  year: number
  currency: string
  // Bulk settings applied to all categories
  bulkSettings: {
    alertThreshold: string
    isActive: boolean
  }
  categoryAllocations: Record<string, {
    amount: string
    // Individual overrides (optional)
    alertThreshold?: string
    isActive?: boolean
  }>
}