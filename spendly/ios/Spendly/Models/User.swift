import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let firstName: String
    let lastName: String
    let defaultCurrency: String
    let timezone: String
    let dateFormat: String
    let language: String
    let isActive: Bool
    let emailVerified: Bool
    let lastLoginAt: Date?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case firstName = "first_name"
        case lastName = "last_name"
        case defaultCurrency = "default_currency"
        case timezone
        case dateFormat = "date_format"
        case language
        case isActive = "is_active"
        case emailVerified = "email_verified"
        case lastLoginAt = "last_login_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Basic string fields
        id = try container.decode(String.self, forKey: .id)
        email = try container.decode(String.self, forKey: .email)
        firstName = try container.decode(String.self, forKey: .firstName)
        lastName = try container.decode(String.self, forKey: .lastName)
        defaultCurrency = try container.decode(String.self, forKey: .defaultCurrency)
        timezone = try container.decode(String.self, forKey: .timezone)
        dateFormat = try container.decode(String.self, forKey: .dateFormat)
        language = try container.decode(String.self, forKey: .language)
        
        // Boolean fields
        isActive = try container.decode(Bool.self, forKey: .isActive)
        emailVerified = try container.decode(Bool.self, forKey: .emailVerified)
        
        // Custom date decoding for backend format: "2025-08-10T22:23:41.473299"
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        dateFormatter.timeZone = TimeZone(secondsFromGMT: 0)
        
        // Decode optional lastLoginAt
        if let lastLoginString = try container.decodeIfPresent(String.self, forKey: .lastLoginAt) {
            lastLoginAt = dateFormatter.date(from: lastLoginString)
        } else {
            lastLoginAt = nil
        }
        
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
    
    var fullName: String {
        "\(firstName) \(lastName)"
    }
}

// MARK: - Authentication Models
struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct RegisterRequest: Encodable {
    let email: String
    let password: String
    let firstName: String
    let lastName: String
    let defaultCurrency: String
    
    enum CodingKeys: String, CodingKey {
        case email
        case password
        case firstName = "first_name"
        case lastName = "last_name"
        case defaultCurrency = "default_currency"
    }
}

struct AuthTokens: Codable {
    let accessToken: String
    let refreshToken: String
    let tokenType: String
    let expiresIn: Int?
    
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case tokenType = "token_type"
        case expiresIn = "expires_in"
    }
}