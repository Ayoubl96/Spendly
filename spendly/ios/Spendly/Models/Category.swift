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
}

struct CategoryTree: Codable, Identifiable {
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
    let subcategories: [CategoryTree]
    let expenseCount: Int
    let totalAmount: Double
    
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
        case subcategories
        case expenseCount = "expense_count"
        case totalAmount = "total_amount"
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
    let sortOrder: Int?
    
    enum CodingKeys: String, CodingKey {
        case name
        case parentId = "parent_id"
        case color
        case icon
        case sortOrder = "sort_order"
    }
}

struct UpdateCategoryRequest: Encodable {
    let name: String?
    let parentId: String?
    let color: String?
    let icon: String?
    let sortOrder: Int?
    
    enum CodingKeys: String, CodingKey {
        case name
        case parentId = "parent_id"
        case color
        case icon
        case sortOrder = "sort_order"
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