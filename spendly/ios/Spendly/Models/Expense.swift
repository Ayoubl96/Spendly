import Foundation
import SwiftUI

// MARK: - Legacy Payment Method Support (duplicated for compilation)
enum LegacyPaymentMethod: String, Codable, CaseIterable {
    case cash = "cash"
    case card = "card"
    case bankTransfer = "bank_transfer"
    case other = "other"
    
    var displayName: String {
        switch self {
        case .cash: return "Cash"
        case .card: return "Card"
        case .bankTransfer: return "Bank Transfer"
        case .other: return "Other"
        }
    }
}

// MARK: - User Payment Method Models
struct UserPaymentMethod: Codable, Identifiable {
    let id: String
    let userId: String
    let name: String
    let description: String?
    let icon: String?
    let color: String?
    let sortOrder: Int
    let isActive: Bool
    let isDefault: Bool
    let canDelete: Bool
    let createdAt: String
    let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case description
        case icon
        case color
        case sortOrder = "sort_order"
        case isActive = "is_active"
        case isDefault = "is_default"
        case canDelete = "can_delete"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct CreatePaymentMethodRequest: Codable {
    let name: String
    let description: String?
    let icon: String?
    let color: String?
    let sortOrder: Int?
    let isActive: Bool?
    
    enum CodingKeys: String, CodingKey {
        case name
        case description
        case icon
        case color
        case sortOrder = "sort_order"
        case isActive = "is_active"
    }
}

struct UpdatePaymentMethodRequest: Codable {
    let name: String?
    let description: String?
    let icon: String?
    let color: String?
    let sortOrder: Int?
    let isActive: Bool?
    
    enum CodingKeys: String, CodingKey {
        case name
        case description
        case icon
        case color
        case sortOrder = "sort_order"
        case isActive = "is_active"
    }
}

struct PaymentMethodWithStats: Codable, Identifiable {
    let id: String
    let userId: String
    let name: String
    let description: String?
    let icon: String?
    let color: String?
    let sortOrder: Int
    let isActive: Bool
    let isDefault: Bool
    let canDelete: Bool
    let createdAt: String
    let updatedAt: String
    let expenseCount: Int
    let totalAmount: Double
    let lastUsed: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case description
        case icon
        case color
        case sortOrder = "sort_order"
        case isActive = "is_active"
        case isDefault = "is_default"
        case canDelete = "can_delete"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case expenseCount = "expense_count"
        case totalAmount = "total_amount"
        case lastUsed = "last_used"
    }
}

struct Expense: Codable, Identifiable {
    let id: String
    let amount: Double
    let currency: String
    let amountInBaseCurrency: Double?
    let exchangeRate: Double?
    let description: String
    let expenseDate: Date
    let userId: String
    let categoryId: String?
    let subcategoryId: String?
    let paymentMethod: LegacyPaymentMethod?  // Legacy field
    let paymentMethodId: String?            // New user payment method reference
    let receiptUrl: String?
    let notes: String?
    let location: String?
    let vendor: String?
    let isShared: Bool
    let sharedWith: [String]?
    let tags: [String]?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case amount
        case currency
        case amountInBaseCurrency = "amount_in_base_currency"
        case exchangeRate = "exchange_rate"
        case description
        case expenseDate = "expense_date"
        case userId = "user_id"
        case categoryId = "category_id"
        case subcategoryId = "subcategory_id"
        case paymentMethod = "payment_method"
        case paymentMethodId = "payment_method_id"
        case receiptUrl = "receipt_url"
        case notes
        case location
        case vendor
        case isShared = "is_shared"
        case sharedWith = "shared_with"
        case tags
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Basic fields
        id = try container.decode(String.self, forKey: .id)
        amount = try container.decode(Double.self, forKey: .amount)
        currency = try container.decode(String.self, forKey: .currency)
        amountInBaseCurrency = try container.decodeIfPresent(Double.self, forKey: .amountInBaseCurrency)
        exchangeRate = try container.decodeIfPresent(Double.self, forKey: .exchangeRate)
        description = try container.decode(String.self, forKey: .description)
        userId = try container.decode(String.self, forKey: .userId)
        categoryId = try container.decodeIfPresent(String.self, forKey: .categoryId)
        subcategoryId = try container.decodeIfPresent(String.self, forKey: .subcategoryId)
        paymentMethod = try container.decodeIfPresent(LegacyPaymentMethod.self, forKey: .paymentMethod)
        paymentMethodId = try container.decodeIfPresent(String.self, forKey: .paymentMethodId)
        receiptUrl = try container.decodeIfPresent(String.self, forKey: .receiptUrl)
        notes = try container.decodeIfPresent(String.self, forKey: .notes)
        location = try container.decodeIfPresent(String.self, forKey: .location)
        vendor = try container.decodeIfPresent(String.self, forKey: .vendor)
        isShared = try container.decode(Bool.self, forKey: .isShared)
        sharedWith = try container.decodeIfPresent([String].self, forKey: .sharedWith)
        tags = try container.decodeIfPresent([String].self, forKey: .tags)
        
        // Flexible date decoding to handle multiple backend formats
        func parseDate(from string: String, key: CodingKeys) throws -> Date {
            let formatters = [
                // ISO8601 with fractional seconds
                {
                    let f = DateFormatter()
                    f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
                    f.locale = Locale(identifier: "en_US_POSIX")
                    f.timeZone = TimeZone(secondsFromGMT: 0)
                    return f
                }(),
                // ISO8601 standard
                ISO8601DateFormatter(),
                // Date only format
                {
                    let f = DateFormatter()
                    f.dateFormat = "yyyy-MM-dd"
                    f.locale = Locale(identifier: "en_US_POSIX")
                    f.timeZone = TimeZone(secondsFromGMT: 0)
                    return f
                }(),
                // Alternative ISO format
                {
                    let f = DateFormatter()
                    f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss'Z'"
                    f.locale = Locale(identifier: "en_US_POSIX")
                    f.timeZone = TimeZone(secondsFromGMT: 0)
                    return f
                }()
            ]
            
            for formatter in formatters {
                if let date = formatter.date(from: string) {
                    return date
                }
            }
            
            // If all formatters fail, try ISO8601DateFormatter with fractional seconds
            let iso8601 = ISO8601DateFormatter()
            iso8601.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = iso8601.date(from: string) {
                return date
            }
            
            throw DecodingError.dataCorruptedError(forKey: key, in: container, debugDescription: "Date string '\(string)' does not match any expected format")
        }
        
        // Decode dates
        let expenseDateString = try container.decode(String.self, forKey: .expenseDate)
        expenseDate = try parseDate(from: expenseDateString, key: .expenseDate)
        
        let createdAtString = try container.decode(String.self, forKey: .createdAt)
        createdAt = try parseDate(from: createdAtString, key: .createdAt)
        
        let updatedAtString = try container.decode(String.self, forKey: .updatedAt)
        updatedAt = try parseDate(from: updatedAtString, key: .updatedAt)
    }
}

// Legacy PaymentMethod enum moved to PaymentMethod.swift as LegacyPaymentMethod

struct CreateExpenseRequest: Encodable {
    let amount: Double
    let currency: String
    let description: String
    let expenseDate: Date
    let categoryId: String?
    let subcategoryId: String?
    let paymentMethod: LegacyPaymentMethod?  // Legacy field
    let paymentMethodId: String?            // New user payment method reference
    let notes: String?
    let location: String?
    let vendor: String?
    let isShared: Bool?
    let sharedWith: [String]?
    let tags: [String]?
    let amountInBaseCurrency: Double?
    let exchangeRate: Double?
    
    enum CodingKeys: String, CodingKey {
        case amount
        case currency
        case description
        case expenseDate = "expense_date"
        case categoryId = "category_id"
        case subcategoryId = "subcategory_id"
        case paymentMethod = "payment_method"
        case paymentMethodId = "payment_method_id"
        case notes
        case location
        case vendor
        case isShared = "is_shared"
        case sharedWith = "shared_with"
        case tags
        case amountInBaseCurrency = "amount_in_base_currency"
        case exchangeRate = "exchange_rate"
    }
}

struct ExpenseFilters {
    var startDate: Date?
    var endDate: Date?
    var categoryId: String?
    var subcategoryId: String?
    var currency: String?
    var paymentMethod: UserPaymentMethod?
    var minAmount: Double?
    var maxAmount: Double?
    var search: String?
    var isShared: Bool?
    var tags: [String]?
}

extension ExpenseFilters: CustomStringConvertible {
    var description: String {
        var parts: [String] = []
        if startDate != nil { parts.append("startDate") }
        if endDate != nil { parts.append("endDate") }
        if categoryId != nil { parts.append("categoryId") }
        if subcategoryId != nil { parts.append("subcategoryId") }
        if currency != nil { parts.append("currency") }
        if paymentMethod != nil { parts.append("paymentMethod") }
        if minAmount != nil { parts.append("minAmount") }
        if maxAmount != nil { parts.append("maxAmount") }
        if search != nil { parts.append("search") }
        if isShared != nil { parts.append("isShared") }
        if tags != nil { parts.append("tags") }
        
        if parts.isEmpty {
            return "ExpenseFilters(no filters)"
        } else {
            return "ExpenseFilters(\(parts.joined(separator: ", ")))"
        }
    }
}

struct ExpenseSummary: Codable {
    let totalAmount: Double
    let totalCount: Int
    let currency: String
    let periodStart: Date
    let periodEnd: Date
    let categoryBreakdown: [String: CategoryBreakdown]
    let monthlyBreakdown: [MonthlyBreakdown]
    
    enum CodingKeys: String, CodingKey {
        case totalAmount = "total_amount"
        case totalCount = "total_count"
        case currency
        case periodStart = "period_start"
        case periodEnd = "period_end"
        case categoryBreakdown = "category_breakdown"
        case monthlyBreakdown = "monthly_breakdown"
    }
}

struct CategoryBreakdown: Codable {
    let amount: Double
    let count: Int
    let categoryId: String
    
    enum CodingKeys: String, CodingKey {
        case amount
        case count
        case categoryId = "category_id"
    }
}

struct MonthlyBreakdown: Codable {
    let month: Int
    let totalAmount: Double
    let totalCount: Int
    
    enum CodingKeys: String, CodingKey {
        case month
        case totalAmount = "total_amount"
        case totalCount = "total_count"
    }
}