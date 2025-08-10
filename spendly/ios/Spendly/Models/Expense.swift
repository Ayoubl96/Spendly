import Foundation

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
    let paymentMethod: PaymentMethod?
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
}

enum PaymentMethod: String, Codable, CaseIterable {
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
    
    var icon: String {
        switch self {
        case .cash: return "banknote"
        case .card: return "creditcard"
        case .bankTransfer: return "building.columns"
        case .other: return "ellipsis.circle"
        }
    }
}

struct CreateExpenseRequest: Encodable {
    let amount: Double
    let currency: String
    let description: String
    let expenseDate: Date
    let categoryId: String?
    let subcategoryId: String?
    let paymentMethod: PaymentMethod?
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
    var paymentMethod: PaymentMethod?
    var minAmount: Double?
    var maxAmount: Double?
    var search: String?
    var isShared: Bool?
    var tags: [String]?
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