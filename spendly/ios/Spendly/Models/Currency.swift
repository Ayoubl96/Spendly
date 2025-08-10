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