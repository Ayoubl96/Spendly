import Foundation
import SwiftUI

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
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Basic fields
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        amount = try container.decode(Double.self, forKey: .amount)
        currency = try container.decode(String.self, forKey: .currency)
        periodType = try container.decode(PeriodType.self, forKey: .periodType)
        userId = try container.decode(String.self, forKey: .userId)
        categoryId = try container.decodeIfPresent(String.self, forKey: .categoryId)
        subcategoryId = try container.decodeIfPresent(String.self, forKey: .subcategoryId)
        budgetGroupId = try container.decodeIfPresent(String.self, forKey: .budgetGroupId)
        alertThreshold = try container.decode(Double.self, forKey: .alertThreshold)
        isActive = try container.decode(Bool.self, forKey: .isActive)
        
        // Custom date decoding for backend format: "2025-08-10T15:32:27.210908"
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        dateFormatter.timeZone = TimeZone(secondsFromGMT: 0)
        
        // Decode start date
        let startDateString = try container.decode(String.self, forKey: .startDate)
        guard let startDateParsed = dateFormatter.date(from: startDateString) else {
            throw DecodingError.dataCorruptedError(forKey: .startDate, in: container, debugDescription: "Date string does not match expected format")
        }
        startDate = startDateParsed
        
        // Decode optional end date
        if let endDateString = try container.decodeIfPresent(String.self, forKey: .endDate) {
            endDate = dateFormatter.date(from: endDateString)
        } else {
            endDate = nil
        }
        
        // Decode created and updated dates
        let createdAtString = try container.decode(String.self, forKey: .createdAt)
        guard let createdAtDate = dateFormatter.date(from: createdAtString) else {
            throw DecodingError.dataCorruptedError(forKey: .createdAt, in: container, debugDescription: "Date string does not match expected format")
        }
        createdAt = createdAtDate
        
        let updatedAtString = try container.decode(String.self, forKey: .updatedAt)
        guard let updatedAtDate = dateFormatter.date(from: updatedAtString) else {
            throw DecodingError.dataCorruptedError(forKey: .updatedAt, in: container, debugDescription: "Date string does not match expected format")
        }
        updatedAt = updatedAtDate
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
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Basic fields
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        periodType = try container.decode(BudgetGroupPeriodType.self, forKey: .periodType)
        currency = try container.decode(String.self, forKey: .currency)
        userId = try container.decode(String.self, forKey: .userId)
        isActive = try container.decode(Bool.self, forKey: .isActive)
        
        // Custom date decoding for backend format: "2025-08-10T15:32:27.210908"
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        dateFormatter.timeZone = TimeZone(secondsFromGMT: 0)
        
        // Decode start date
        let startDateString = try container.decode(String.self, forKey: .startDate)
        guard let startDateParsed = dateFormatter.date(from: startDateString) else {
            throw DecodingError.dataCorruptedError(forKey: .startDate, in: container, debugDescription: "Date string does not match expected format")
        }
        startDate = startDateParsed
        
        // Decode end date
        let endDateString = try container.decode(String.self, forKey: .endDate)
        guard let endDateParsed = dateFormatter.date(from: endDateString) else {
            throw DecodingError.dataCorruptedError(forKey: .endDate, in: container, debugDescription: "Date string does not match expected format")
        }
        endDate = endDateParsed
        
        // Decode created and updated dates
        let createdAtString = try container.decode(String.self, forKey: .createdAt)
        guard let createdAtDate = dateFormatter.date(from: createdAtString) else {
            throw DecodingError.dataCorruptedError(forKey: .createdAt, in: container, debugDescription: "Date string does not match expected format")
        }
        createdAt = createdAtDate
        
        let updatedAtString = try container.decode(String.self, forKey: .updatedAt)
        guard let updatedAtDate = dateFormatter.date(from: updatedAtString) else {
            throw DecodingError.dataCorruptedError(forKey: .updatedAt, in: container, debugDescription: "Date string does not match expected format")
        }
        updatedAt = updatedAtDate
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
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Decode basic fields
        budgetId = try container.decode(String.self, forKey: .budgetId)
        name = try container.decode(String.self, forKey: .name)
        currency = try container.decode(String.self, forKey: .currency)
        periodType = try container.decode(String.self, forKey: .periodType)
        status = try container.decode(BudgetStatus.self, forKey: .status)
        isOverBudget = try container.decode(Bool.self, forKey: .isOverBudget)
        shouldAlert = try container.decode(Bool.self, forKey: .shouldAlert)
        
        // Decode decimal values that might come as strings
        amount = try container.decodeFlexibleDouble(forKey: .amount)
        spent = try container.decodeFlexibleDouble(forKey: .spent)
        remaining = try container.decodeFlexibleDouble(forKey: .remaining)
        percentageUsed = try container.decodeFlexibleDouble(forKey: .percentageUsed)
        alertThreshold = try container.decodeFlexibleDouble(forKey: .alertThreshold)
        
        // Decode dates
        startDate = try container.decode(Date.self, forKey: .startDate)
        endDate = try container.decodeIfPresent(Date.self, forKey: .endDate)
        
        // Decode optional category
        category = try container.decodeIfPresent(Category.self, forKey: .category)
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
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Decode decimal values that might come as strings or numbers
        totalBudget = try container.decodeFlexibleDouble(forKey: .totalBudget)
        totalSpent = try container.decodeFlexibleDouble(forKey: .totalSpent)
        totalRemaining = try container.decodeFlexibleDouble(forKey: .totalRemaining)
        overallPercentage = try container.decodeFlexibleDouble(forKey: .overallPercentage)
        
        // Decode other fields normally
        overallStatus = try container.decode(BudgetStatus.self, forKey: .overallStatus)
        budgetCount = try container.decode(Int.self, forKey: .budgetCount)
        statusCounts = try container.decode([String: Int].self, forKey: .statusCounts)
        budgets = try container.decode([BudgetPerformance].self, forKey: .budgets)
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
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Decode basic fields
        budgetGroup = try container.decode(BudgetGroup.self, forKey: .budgetGroup)
        status = try container.decode(BudgetStatus.self, forKey: .status)
        budgetCount = try container.decode(Int.self, forKey: .budgetCount)
        categorySummaries = try container.decode([String: CategorySummary].self, forKey: .categorySummaries)
        
        // Decode decimal values that might come as strings
        totalBudgeted = try container.decodeFlexibleDouble(forKey: .totalBudgeted)
        totalSpent = try container.decodeFlexibleDouble(forKey: .totalSpent)
        totalRemaining = try container.decodeFlexibleDouble(forKey: .totalRemaining)
        percentageUsed = try container.decodeFlexibleDouble(forKey: .percentageUsed)
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
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Decode basic fields
        categoryId = try container.decode(String.self, forKey: .categoryId)
        categoryName = try container.decode(String.self, forKey: .categoryName)
        subcategories = try container.decode([String: SubcategorySummary].self, forKey: .subcategories)
        
        // Decode decimal values that might come as strings
        budgeted = try container.decodeFlexibleDouble(forKey: .budgeted)
        spent = try container.decodeFlexibleDouble(forKey: .spent)
        remaining = try container.decodeFlexibleDouble(forKey: .remaining)
        
        // Handle optional percentage
        percentageUsed = try container.decodeFlexibleDoubleIfPresent(forKey: .percentageUsed)
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
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Decode basic fields
        categoryId = try container.decode(String.self, forKey: .categoryId)
        categoryName = try container.decode(String.self, forKey: .categoryName)
        
        // Decode decimal values that might come as strings
        budgeted = try container.decodeFlexibleDouble(forKey: .budgeted)
        spent = try container.decodeFlexibleDouble(forKey: .spent)
        remaining = try container.decodeFlexibleDouble(forKey: .remaining)
        
        // Handle optional percentage
        percentageUsed = try container.decodeFlexibleDoubleIfPresent(forKey: .percentageUsed)
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

// MARK: - Flexible Decoding Extensions
extension KeyedDecodingContainer {
    /// Decodes a Double value that might come as a string or a number from the API
    func decodeFlexibleDouble(forKey key: Key) throws -> Double {
        do {
            // Try to decode as Double first
            return try decode(Double.self, forKey: key)
        } catch {
            // If that fails, try to decode as String and convert to Double
            let stringValue = try decode(String.self, forKey: key)
            guard let doubleValue = Double(stringValue) else {
                throw DecodingError.dataCorruptedError(
                    forKey: key, 
                    in: self, 
                    debugDescription: "Expected Double or String convertible to Double, but got '\(stringValue)'"
                )
            }
            return doubleValue
        }
    }
    
    /// Decodes an optional Double value that might come as a string or a number from the API
    func decodeFlexibleDoubleIfPresent(forKey key: Key) throws -> Double? {
        guard contains(key) else { return nil }
        
        do {
            // Try to decode as Double first
            return try decodeIfPresent(Double.self, forKey: key)
        } catch {
            // If that fails, try to decode as String and convert to Double
            guard let stringValue = try decodeIfPresent(String.self, forKey: key) else {
                return nil
            }
            return Double(stringValue)
        }
    }
}