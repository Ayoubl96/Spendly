import Foundation
import Combine

enum APIError: Error, LocalizedError {
    case invalidURL
    case noData
    case decodingError
    case networkError(String)
    case unauthorized
    case serverError(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noData:
            return "No data received"
        case .decodingError:
            return "Failed to decode response"
        case .networkError(let message):
            return "Network error: \(message)"
        case .unauthorized:
            return "Unauthorized - Please login again"
        case .serverError(let message):
            return "Server error: \(message)"
        }
    }
}

class APIService: ObservableObject {
    static let shared = APIService()
    
    private let baseURL = ProcessInfo.processInfo.environment["API_URL"] ?? "https://spendly-api.ayoublefhim.com/api/v1"
    private var authToken: String?
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    
    private init() {
        decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        
        encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        
        // Load token from keychain if available
        authToken = KeychainManager.shared.getToken()
    }
    
    func setAuthToken(_ token: String) {
        authToken = token
        KeychainManager.shared.saveToken(token)
    }
    
    func clearAuthToken() {
        authToken = nil
        KeychainManager.shared.deleteToken()
    }
    
    private func createRequest(endpoint: String, method: String = "GET", body: Data? = nil) throws -> URLRequest {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        request.httpBody = body
        
        return request
    }
    
    private func handleResponse<T: Decodable>(_ data: Data?, _ response: URLResponse?, _ error: Error?, type: T.Type) throws -> T {
        if let error = error {
            throw APIError.networkError(error.localizedDescription)
        }
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.networkError("Invalid response")
        }
        
        switch httpResponse.statusCode {
        case 200...299:
            guard let data = data else {
                throw APIError.noData
            }
            
            // Debug logging: print the raw response
            if let responseString = String(data: data, encoding: .utf8) {
                NSLog("🔍 API Response for \(T.self):")
                NSLog("📄 Raw JSON: \(responseString)")
                NSLog("📊 Status Code: \(httpResponse.statusCode)")
            }
            
            do {
                return try decoder.decode(T.self, from: data)
            } catch {
                NSLog("❌ Decoding error for \(T.self): \(error)")
                if let responseString = String(data: data, encoding: .utf8) {
                    NSLog("📄 Failed to decode JSON: \(responseString)")
                }
                throw APIError.decodingError
            }
            
        case 401:
            clearAuthToken()
            throw APIError.unauthorized
            
        default:
            if let data = data,
               let errorMessage = String(data: data, encoding: .utf8) {
                throw APIError.serverError(errorMessage)
            }
            throw APIError.serverError("Status code: \(httpResponse.statusCode)")
        }
    }
    
    // MARK: - Authentication
    
    func login(email: String, password: String) async throws -> (AuthTokens, User) {
        let formData = "username=\(email)&password=\(password)"
        guard let bodyData = formData.data(using: .utf8) else {
            throw APIError.networkError("Invalid form data")
        }
        
        var request = try createRequest(endpoint: "/auth/login", method: "POST", body: bodyData)
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        let tokens = try handleResponse(data, response, nil, type: AuthTokens.self)
        
        setAuthToken(tokens.accessToken)
        
        // Get user info
        let user = try await getCurrentUser()
        
        return (tokens, user)
    }
    
    func register(_ request: RegisterRequest) async throws -> User {
        let body = try encoder.encode(request)
        let urlRequest = try createRequest(endpoint: "/auth/register", method: "POST", body: body)
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        return try handleResponse(data, response, nil, type: User.self)
    }
    
    func logout() async throws {
        let request = try createRequest(endpoint: "/auth/logout", method: "POST")
        let (_, _) = try await URLSession.shared.data(for: request)
        clearAuthToken()
    }
    
    // MARK: - User
    
    func getCurrentUser() async throws -> User {
        let request = try createRequest(endpoint: "/users/me")
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: User.self)
    }
    
    func updateProfile(_ user: User) async throws -> User {
        let body = try encoder.encode(user)
        let request = try createRequest(endpoint: "/users/me", method: "PUT", body: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: User.self)
    }
    
    // MARK: - Expenses
    
    func getExpenses(filters: ExpenseFilters? = nil) async throws -> [Expense] {
        var endpoint = "/expenses/"
        
        if let filters = filters {
            var queryItems: [URLQueryItem] = []
            
            if let startDate = filters.startDate {
                queryItems.append(URLQueryItem(name: "start_date", value: ISO8601DateFormatter().string(from: startDate)))
            }
            if let endDate = filters.endDate {
                queryItems.append(URLQueryItem(name: "end_date", value: ISO8601DateFormatter().string(from: endDate)))
            }
            if let categoryId = filters.categoryId {
                queryItems.append(URLQueryItem(name: "category_id", value: categoryId))
            }
            if let currency = filters.currency {
                queryItems.append(URLQueryItem(name: "currency", value: currency))
            }
            if let search = filters.search {
                queryItems.append(URLQueryItem(name: "search", value: search))
            }
            
            if !queryItems.isEmpty {
                var components = URLComponents(string: endpoint)!
                components.queryItems = queryItems
                endpoint = components.string!
            }
        }
        
        let request = try createRequest(endpoint: endpoint)
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: [Expense].self)
    }
    
    func createExpense(_ expense: CreateExpenseRequest) async throws -> Expense {
        let body = try encoder.encode(expense)
        let request = try createRequest(endpoint: "/expenses/", method: "POST", body: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: Expense.self)
    }
    
    func updateExpense(id: String, expense: CreateExpenseRequest) async throws -> Expense {
        let body = try encoder.encode(expense)
        let request = try createRequest(endpoint: "/expenses/\(id)", method: "PUT", body: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: Expense.self)
    }
    
    func deleteExpense(id: String) async throws {
        let request = try createRequest(endpoint: "/expenses/\(id)", method: "DELETE")
        let (_, _) = try await URLSession.shared.data(for: request)
    }
    
    func getExpenseSummary(year: Int, month: Int) async throws -> ExpenseSummary {
        let request = try createRequest(endpoint: "/expenses/summary/monthly?year=\(year)&month=\(month)")
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: ExpenseSummary.self)
    }
    
    // MARK: - Categories
    
    func getCategories() async throws -> [Category] {
        let request = try createRequest(endpoint: "/categories/")
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: [Category].self)
    }
    
    func getCategoryTree() async throws -> [CategoryTree] {
        let request = try createRequest(endpoint: "/categories/tree")
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: [CategoryTree].self)
    }
    
    func createCategory(_ category: CreateCategoryRequest) async throws -> Category {
        let body = try encoder.encode(category)
        let request = try createRequest(endpoint: "/categories/", method: "POST", body: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: Category.self)
    }
    
    func updateCategory(id: String, category: UpdateCategoryRequest) async throws -> Category {
        let body = try encoder.encode(category)
        let request = try createRequest(endpoint: "/categories/\(id)", method: "PUT", body: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: Category.self)
    }
    
    func deleteCategory(id: String, reassignTo: String? = nil) async throws -> DeleteCategoryResponse {
        var endpoint = "/categories/\(id)"
        if let reassignTo = reassignTo {
            endpoint += "?reassign_to_category_id=\(reassignTo)"
        }
        
        let request = try createRequest(endpoint: endpoint, method: "DELETE")
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: DeleteCategoryResponse.self)
    }
    
    func getCategoryStats(id: String) async throws -> CategoryStats {
        let request = try createRequest(endpoint: "/categories/\(id)/stats")
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: CategoryStats.self)
    }
    
    // MARK: - Currencies
    
    func getCurrencies() async throws -> [Currency] {
        let request = try createRequest(endpoint: "/currencies/")
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: [Currency].self)
    }
    
    func getExchangeRate(from: String, to: String) async throws -> ExchangeRateResponse {
        let request = try createRequest(endpoint: "/currencies/exchange-rate/\(from)/\(to)")
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: ExchangeRateResponse.self)
    }
    
    func convertCurrency(_ conversion: CurrencyConversionRequest) async throws -> CurrencyConversionResponse {
        let body = try encoder.encode(conversion)
        let request = try createRequest(endpoint: "/currencies/convert", method: "POST", body: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: CurrencyConversionResponse.self)
    }
    
    // MARK: - Budgets
    
    func getBudgets() async throws -> [Budget] {
        let request = try createRequest(endpoint: "/budgets/")
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: [Budget].self)
    }
    
    func getBudgetSummary() async throws -> BudgetSummary {
        let request = try createRequest(endpoint: "/budgets/summary")
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: BudgetSummary.self)
    }
    
    func createBudget(_ budget: CreateBudgetRequest) async throws -> Budget {
        let body = try encoder.encode(budget)
        let request = try createRequest(endpoint: "/budgets/", method: "POST", body: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: Budget.self)
    }
    
    func updateBudget(id: String, budget: CreateBudgetRequest) async throws -> Budget {
        let body = try encoder.encode(budget)
        let request = try createRequest(endpoint: "/budgets/\(id)", method: "PUT", body: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: Budget.self)
    }
    
    func deleteBudget(id: String) async throws {
        let request = try createRequest(endpoint: "/budgets/\(id)", method: "DELETE")
        let (_, _) = try await URLSession.shared.data(for: request)
    }
    
    func getBudgetPerformance(id: String) async throws -> BudgetPerformance {
        let request = try createRequest(endpoint: "/budgets/\(id)/performance")
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: BudgetPerformance.self)
    }
    
    // MARK: - Budget Groups
    
    func getBudgetGroups() async throws -> [BudgetGroup] {
        let request = try createRequest(endpoint: "/budget-groups/")
        let (data, response) = try await URLSession.shared.data(for: request)
        
        struct BudgetGroupList: Decodable {
            let items: [BudgetGroup]
        }
        
        let list = try handleResponse(data, response, nil, type: BudgetGroupList.self)
        return list.items
    }
    
    func createBudgetGroup(_ group: CreateBudgetGroupRequest) async throws -> BudgetGroup {
        let body = try encoder.encode(group)
        let request = try createRequest(endpoint: "/budget-groups/", method: "POST", body: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: BudgetGroup.self)
    }
    
    func getBudgetGroupSummary(id: String) async throws -> BudgetGroupSummary {
        let request = try createRequest(endpoint: "/budget-groups/\(id)/summary")
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response, nil, type: BudgetGroupSummary.self)
    }
}