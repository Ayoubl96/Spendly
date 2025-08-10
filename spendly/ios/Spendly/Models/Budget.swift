import Foundation

struct Budget: Codable, Identifiable {
    let id: String
    let name: String
    let amount: Double
    let currency: String
    let periodType: PeriodType
    let startDate: Date
    let endDate: Date?
    let userId: String
    let categoryId: String?
    let subcategoryId: String?
    let budgetGroupId: String?
    let alertThreshold: Double
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case amount
        case currency
        case periodType = "period_type"
        case startDate = "start_date"
        case endDate = "end_date"
        case userId = "user_id"
        case categoryId = "category_id"
        case subcategoryId = "subcategory_id"
        case budgetGroupId = "budget_group_id"
        case alertThreshold = "alert_threshold"
        case isActive = "is_active"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum PeriodType: String, Codable, CaseIterable {
    case weekly = "weekly"
    case monthly = "monthly"
    case yearly = "yearly"
    case custom = "custom"
    
    var displayName: String {
        switch self {
        case .weekly: return "Weekly"
        case .monthly: return "Monthly"
        case .yearly: return "Yearly"
        case .custom: return "Custom"
        }
    }
}

struct BudgetGroup: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let periodType: BudgetGroupPeriodType
    let startDate: Date
    let endDate: Date
    let currency: String
    let userId: String
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case description
        case periodType = "period_type"
        case startDate = "start_date"
        case endDate = "end_date"
        case currency
        case userId = "user_id"
        case isActive = "is_active"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum BudgetGroupPeriodType: String, Codable, CaseIterable {
    case monthly = "monthly"
    case quarterly = "quarterly"
    case yearly = "yearly"
    case custom = "custom"
    
    var displayName: String {
        switch self {
        case .monthly: return "Monthly"
        case .quarterly: return "Quarterly"
        case .yearly: return "Yearly"
        case .custom: return "Custom"
        }
    }
}

struct BudgetPerformance: Codable, Identifiable {
    let budgetId: String
    let name: String
    let amount: Double
    let spent: Double
    let remaining: Double
    let percentageUsed: Double
    let status: BudgetStatus
    let isOverBudget: Bool
    let shouldAlert: Bool
    let alertThreshold: Double
    let currency: String
    let periodType: String
    let startDate: Date
    let endDate: Date?
    let category: Category?
    
    var id: String { budgetId }
    
    enum CodingKeys: String, CodingKey {
        case budgetId = "budget_id"
        case name
        case amount
        case spent
        case remaining
        case percentageUsed = "percentage_used"
        case status
        case isOverBudget = "is_over_budget"
        case shouldAlert = "should_alert"
        case alertThreshold = "alert_threshold"
        case currency
        case periodType = "period_type"
        case startDate = "start_date"
        case endDate = "end_date"
        case category
    }
}

enum BudgetStatus: String, Codable {
    case onTrack = "on_track"
    case warning = "warning"
    case overBudget = "over_budget"
    
    var displayName: String {
        switch self {
        case .onTrack: return "On Track"
        case .warning: return "Warning"
        case .overBudget: return "Over Budget"
        }
    }
    
    var color: String {
        switch self {
        case .onTrack: return "green"
        case .warning: return "orange"
        case .overBudget: return "red"
        }
    }
}

struct BudgetSummary: Codable {
    let totalBudget: Double
    let totalSpent: Double
    let totalRemaining: Double
    let overallPercentage: Double
    let overallStatus: BudgetStatus
    let budgetCount: Int
    let statusCounts: [String: Int]
    let budgets: [BudgetPerformance]
    
    enum CodingKeys: String, CodingKey {
        case totalBudget = "total_budget"
        case totalSpent = "total_spent"
        case totalRemaining = "total_remaining"
        case overallPercentage = "overall_percentage"
        case overallStatus = "overall_status"
        case budgetCount = "budget_count"
        case statusCounts = "status_counts"
        case budgets
    }
}

struct BudgetGroupSummary: Codable {
    let budgetGroup: BudgetGroup
    let totalBudgeted: Double
    let totalSpent: Double
    let totalRemaining: Double
    let percentageUsed: Double
    let status: BudgetStatus
    let budgetCount: Int
    let categorySummaries: [String: CategorySummary]
    
    enum CodingKeys: String, CodingKey {
        case budgetGroup = "budget_group"
        case totalBudgeted = "total_budgeted"
        case totalSpent = "total_spent"
        case totalRemaining = "total_remaining"
        case percentageUsed = "percentage_used"
        case status
        case budgetCount = "budget_count"
        case categorySummaries = "category_summaries"
    }
}

struct CategorySummary: Codable {
    let categoryId: String
    let categoryName: String
    let budgeted: Double
    let spent: Double
    let remaining: Double
    let percentageUsed: Double?
    let subcategories: [String: SubcategorySummary]
    
    enum CodingKeys: String, CodingKey {
        case categoryId = "category_id"
        case categoryName = "category_name"
        case budgeted
        case spent
        case remaining
        case percentageUsed = "percentage_used"
        case subcategories
    }
}

struct SubcategorySummary: Codable {
    let categoryId: String
    let categoryName: String
    let budgeted: Double
    let spent: Double
    let remaining: Double
    let percentageUsed: Double?
    
    enum CodingKeys: String, CodingKey {
        case categoryId = "category_id"
        case categoryName = "category_name"
        case budgeted
        case spent
        case remaining
        case percentageUsed = "percentage_used"
    }
}

struct CreateBudgetRequest: Encodable {
    let name: String
    let amount: Double
    let currency: String
    let periodType: PeriodType
    let startDate: Date
    let endDate: Date?
    let categoryId: String?
    let budgetGroupId: String?
    let alertThreshold: Double?
    
    enum CodingKeys: String, CodingKey {
        case name
        case amount
        case currency
        case periodType = "period_type"
        case startDate = "start_date"
        case endDate = "end_date"
        case categoryId = "category_id"
        case budgetGroupId = "budget_group_id"
        case alertThreshold = "alert_threshold"
    }
}

struct CreateBudgetGroupRequest: Encodable {
    let name: String
    let description: String?
    let periodType: BudgetGroupPeriodType
    let startDate: Date
    let endDate: Date
    let currency: String
    let autoCreateBudgets: Bool?
    let categoryScope: String?
    let defaultAmount: Double?
    let includeInactiveCategories: Bool?
    let categoryConfigs: [CategoryBudgetConfig]?
    
    enum CodingKeys: String, CodingKey {
        case name
        case description
        case periodType = "period_type"
        case startDate = "start_date"
        case endDate = "end_date"
        case currency
        case autoCreateBudgets = "auto_create_budgets"
        case categoryScope = "category_scope"
        case defaultAmount = "default_amount"
        case includeInactiveCategories = "include_inactive_categories"
        case categoryConfigs = "category_configs"
    }
}

struct CategoryBudgetConfig: Codable {
    let categoryId: String
    let amount: Double
    
    enum CodingKeys: String, CodingKey {
        case categoryId = "category_id"
        case amount
    }
}