import Foundation
import SwiftUI

struct Category: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let parentId: String?
    let userId: String
    let color: String?
    let icon: String?
    let sortOrder: Int
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case parentId = "parent_id"
        case userId = "user_id"
        case color
        case icon
        case sortOrder = "sort_order"
        case isActive = "is_active"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    var displayColor: Color {
        if let color = color {
            return Color(hex: color) ?? .blue
        }
        return .blue
    }
    
    var systemIcon: String {
        iconMap[icon ?? ""] ?? "folder"
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Basic fields
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        parentId = try container.decodeIfPresent(String.self, forKey: .parentId)
        userId = try container.decode(String.self, forKey: .userId)
        color = try container.decodeIfPresent(String.self, forKey: .color)
        icon = try container.decodeIfPresent(String.self, forKey: .icon)
        sortOrder = try container.decode(Int.self, forKey: .sortOrder)
        isActive = try container.decode(Bool.self, forKey: .isActive)
        
        // Custom date decoding for backend format: "2025-08-10T22:23:41.473299"
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        dateFormatter.timeZone = TimeZone(secondsFromGMT: 0)
        
        // Decode required createdAt
        let createdAtString = try container.decode(String.self, forKey: .createdAt)
        guard let createdAtDate = dateFormatter.date(from: createdAtString) else {
            throw DecodingError.dataCorruptedError(forKey: .createdAt, in: container, debugDescription: "Date string does not match expected format")
        }
        createdAt = createdAtDate
        
        // Decode required updatedAt
        let updatedAtString = try container.decode(String.self, forKey: .updatedAt)
        guard let updatedAtDate = dateFormatter.date(from: updatedAtString) else {
            throw DecodingError.dataCorruptedError(forKey: .updatedAt, in: container, debugDescription: "Date string does not match expected format")
        }
        updatedAt = updatedAtDate
    }
}

struct CategoryTree: Codable, Identifiable {
    let id: String
    let name: String
    let color: String?
    let icon: String?
    let sortOrder: Int
    let subcategories: [CategoryTree]
    let expenseCount: Int
    let totalAmount: String // API returns this as string, not double
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case color
        case icon
        case sortOrder = "sort_order"
        case subcategories
        case expenseCount = "expense_count"
        case totalAmount = "total_amount"
    }
    
    // Computed property to get total amount as double
    var totalAmountValue: Double {
        return Double(totalAmount) ?? 0.0
    }
    
    var displayColor: Color {
        if let color = color {
            return Color(hex: color) ?? .blue
        }
        return .blue
    }
    
    var systemIcon: String {
        iconMap[icon ?? ""] ?? "folder"
    }
}

struct CreateCategoryRequest: Encodable {
    let name: String
    let parentId: String?
    let color: String?
    let icon: String?
    let sortOrder: Int
    let isActive: Bool
    
    enum CodingKeys: String, CodingKey {
        case name
        case parentId = "parent_id"
        case color
        case icon
        case sortOrder = "sort_order"
        case isActive = "is_active"
    }
    
    init(name: String, parentId: String? = nil, color: String? = nil, icon: String? = nil, sortOrder: Int = 0, isActive: Bool = true) {
        self.name = name
        self.parentId = parentId
        self.color = color
        self.icon = icon
        self.sortOrder = sortOrder
        self.isActive = isActive
    }
}

struct UpdateCategoryRequest: Encodable {
    let name: String?
    let parentId: String?
    let color: String?
    let icon: String?
    let sortOrder: Int?
    let isActive: Bool?
    
    enum CodingKeys: String, CodingKey {
        case name
        case parentId = "parent_id"
        case color
        case icon
        case sortOrder = "sort_order"
        case isActive = "is_active"
    }
    
    init(name: String? = nil, parentId: String? = nil, color: String? = nil, icon: String? = nil, sortOrder: Int? = nil, isActive: Bool? = nil) {
        self.name = name
        self.parentId = parentId
        self.color = color
        self.icon = icon
        self.sortOrder = sortOrder
        self.isActive = isActive
    }
}

struct CategoryStats: Codable {
    let categoryId: String
    let categoryName: String
    let expenseCount: Int
    let totalAmount: Double
    let subcategoryCount: Int
    let canDelete: Bool
    
    enum CodingKeys: String, CodingKey {
        case categoryId = "category_id"
        case categoryName = "category_name"
        case expenseCount = "expense_count"
        case totalAmount = "total_amount"
        case subcategoryCount = "subcategory_count"
        case canDelete = "can_delete"
    }
}

struct DeleteCategoryResponse: Codable {
    let message: String
    let reassignedExpenses: Int
    let reassignedTo: String?
    
    enum CodingKeys: String, CodingKey {
        case message
        case reassignedExpenses = "reassigned_expenses"
        case reassignedTo = "reassigned_to"
    }
}

// Icon mapping similar to the React app
let iconMap: [String: String] = [
    "shopping-cart": "cart",
    "shopping_cart": "cart",
    "coffee": "cup.and.saucer",
    "car": "car",
    "home": "house",
    "utensils": "fork.knife",
    "restaurant": "fork.knife",
    "food": "fork.knife",
    "heart": "heart",
    "health": "heart",
    "plane": "airplane",
    "travel": "airplane",
    "book": "book",
    "education": "book",
    "music": "music.note",
    "entertainment": "music.note",
    "monitor": "desktopcomputer",
    "technology": "desktopcomputer",
    "shirt": "tshirt",
    "clothing": "tshirt",
    "gift": "gift",
    "gamepad": "gamecontroller",
    "gaming": "gamecontroller",
    "fuel": "fuelpump",
    "gas": "fuelpump",
    "wrench": "wrench",
    "maintenance": "wrench",
    "graduation-cap": "graduationcap",
    "building": "building",
    "briefcase": "briefcase",
    "work": "briefcase",
    "business": "briefcase",
    "tree": "tree",
    "nature": "tree",
    "camera": "camera",
    "photo": "camera",
    "dumbbell": "dumbbell",
    "fitness": "dumbbell",
    "gym": "dumbbell",
    "piggy-bank": "dollarsign.circle",
    "savings": "dollarsign.circle",
    "credit-card": "creditcard",
    "payment": "creditcard",
    "map-pin": "mappin",
    "location": "mappin",
    "users": "person.2",
    "family": "person.2",
    "smartphone": "iphone",
    "phone": "iphone",
    "wifi": "wifi",
    "internet": "wifi",
    "zap": "bolt",
    "electricity": "bolt",
    "utilities": "bolt",
    "droplets": "drop",
    "water": "drop",
    "wind": "wind",
    "air": "wind",
    "trash": "trash",
    "waste": "trash",
    "dog": "pawprint",
    "pet": "pawprint",
    "baby": "figure.child",
    "children": "figure.child",
    "stethoscope": "stethoscope",
    "medical": "stethoscope",
    "pill": "pills",
    "medicine": "pills",
    "package": "shippingbox",
    "delivery": "shippingbox"
]