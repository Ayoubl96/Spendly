import Foundation

struct Currency: Codable, Identifiable, Hashable {
    let code: String
    let name: String
    let symbol: String
    let decimalPlaces: Int
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
    
    var id: String { code }
    
    enum CodingKeys: String, CodingKey {
        case code
        case name
        case symbol
        case decimalPlaces = "decimal_places"
        case isActive = "is_active"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Basic fields
        code = try container.decode(String.self, forKey: .code)
        name = try container.decode(String.self, forKey: .name)
        symbol = try container.decode(String.self, forKey: .symbol)
        decimalPlaces = try container.decode(Int.self, forKey: .decimalPlaces)
        isActive = try container.decode(Bool.self, forKey: .isActive)
        
        // Custom date decoding for backend format: "2025-08-10T15:32:27.210908"
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
    
    var displayName: String {
        "\(name) (\(code))"
    }
}

struct ExchangeRateResponse: Codable {
    let fromCurrency: String
    let toCurrency: String
    let rate: Double
    let timestamp: Date
    
    enum CodingKeys: String, CodingKey {
        case fromCurrency = "from_currency"
        case toCurrency = "to_currency"
        case rate
        case timestamp
    }
}

struct CurrencyConversionResponse: Codable {
    let originalAmount: Double
    let originalCurrency: String
    let convertedAmount: Double
    let targetCurrency: String
    let exchangeRate: Double
    let conversionDate: Date
    
    enum CodingKeys: String, CodingKey {
        case originalAmount = "original_amount"
        case originalCurrency = "original_currency"
        case convertedAmount = "converted_amount"
        case targetCurrency = "target_currency"
        case exchangeRate = "exchange_rate"
        case conversionDate = "conversion_date"
    }
}

struct CurrencyConversionRequest: Encodable {
    let amount: Double
    let fromCurrency: String
    let toCurrency: String
    
    enum CodingKeys: String, CodingKey {
        case amount
        case fromCurrency = "from_currency"
        case toCurrency = "to_currency"
    }
}