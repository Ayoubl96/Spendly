import Foundation
import SwiftUI
import Combine

@MainActor
class ExpenseStore: ObservableObject {
    @Published var expenses: [Expense] = []
    @Published var filteredExpenses: [Expense] = []
    @Published var categories: [Category] = []
    @Published var categoryTree: [CategoryTree] = []
    @Published var currencies: [Currency] = []
    @Published var currentExpense: Expense?
    @Published var filters = ExpenseFilters()
    @Published var isLoading = false
    @Published var error: String?
    @Published var searchText = ""
    
    private let apiService = APIService.shared
    
    var totalAmount: Double {
        filteredExpenses.reduce(0) { $0 + ($1.amountInBaseCurrency ?? $1.amount) }
    }
    
    var thisMonthExpenses: [Expense] {
        let now = Date()
        let startOfMonth = now.startOfMonth
        let endOfMonth = now.endOfMonth
        
        return expenses.filter { expense in
            expense.expenseDate >= startOfMonth && expense.expenseDate <= endOfMonth
        }
    }
    
    var thisMonthTotal: Double {
        thisMonthExpenses.reduce(0) { $0 + ($1.amountInBaseCurrency ?? $1.amount) }
    }
    
    func fetchExpenses() async {
        isLoading = true
        error = nil
        
        do {
            expenses = try await apiService.getExpenses(filters: filters)
            applyFilters()
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func createExpense(_ request: CreateExpenseRequest) async {
        isLoading = true
        error = nil
        
        do {
            let newExpense = try await apiService.createExpense(request)
            expenses.insert(newExpense, at: 0)
            applyFilters()
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func updateExpense(id: String, request: CreateExpenseRequest) async {
        isLoading = true
        error = nil
        
        do {
            let updatedExpense = try await apiService.updateExpense(id: id, expense: request)
            if let index = expenses.firstIndex(where: { $0.id == id }) {
                expenses[index] = updatedExpense
                applyFilters()
            }
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func deleteExpense(id: String) async {
        isLoading = true
        error = nil
        
        do {
            try await apiService.deleteExpense(id: id)
            expenses.removeAll { $0.id == id }
            applyFilters()
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func fetchCategories() async {
        do {
            categories = try await apiService.getCategories()
        } catch {
            if !Task.isCancelled {
                print("Failed to fetch categories: \(error)")
            }
        }
    }
    
    func fetchCategoryTree() async {
        do {
            categoryTree = try await apiService.getCategoryTree()
        } catch {
            print("Failed to fetch category tree: \(error)")
        }
    }
    
    func fetchCurrencies() async {
        do {
            currencies = try await apiService.getCurrencies()
        } catch {
            if !Task.isCancelled {
                print("Failed to fetch currencies: \(error)")
            }
        }
    }
    
    func applyFilters() {
        filteredExpenses = expenses
        
        // Apply search filter (including both searchText and filters.search)
        let searchQuery = !searchText.isEmpty ? searchText : (filters.search ?? "")
        if !searchQuery.isEmpty {
            filteredExpenses = filteredExpenses.filter { expense in
                expense.description.localizedCaseInsensitiveContains(searchQuery) ||
                (expense.vendor?.localizedCaseInsensitiveContains(searchQuery) ?? false) ||
                (expense.notes?.localizedCaseInsensitiveContains(searchQuery) ?? false) ||
                (expense.location?.localizedCaseInsensitiveContains(searchQuery) ?? false)
            }
        }
        
        // Apply date filters
        if let startDate = filters.startDate {
            filteredExpenses = filteredExpenses.filter { $0.expenseDate >= startDate }
        }
        
        if let endDate = filters.endDate {
            filteredExpenses = filteredExpenses.filter { $0.expenseDate <= endDate }
        }
        
        // Apply category filter (includes both category and subcategory)
        if let categoryId = filters.categoryId {
            filteredExpenses = filteredExpenses.filter { expense in
                expense.categoryId == categoryId || expense.subcategoryId == categoryId
            }
        }
        
        // Apply subcategory filter
        if let subcategoryId = filters.subcategoryId {
            filteredExpenses = filteredExpenses.filter { $0.subcategoryId == subcategoryId }
        }
        
        // Apply currency filter
        if let currency = filters.currency {
            filteredExpenses = filteredExpenses.filter { $0.currency == currency }
        }
        
        // Apply payment method filter
        if let paymentMethod = filters.paymentMethod {
            filteredExpenses = filteredExpenses.filter { expense in
                expense.paymentMethodId == paymentMethod.id
            }
        }
        
        // Apply amount filters (use base currency amount if available)
        if let minAmount = filters.minAmount {
            filteredExpenses = filteredExpenses.filter { expense in
                let amount = expense.amountInBaseCurrency ?? expense.amount
                return amount >= minAmount
            }
        }
        
        if let maxAmount = filters.maxAmount {
            filteredExpenses = filteredExpenses.filter { expense in
                let amount = expense.amountInBaseCurrency ?? expense.amount
                return amount <= maxAmount
            }
        }
        
        // Apply tags filter
        if let filterTags = filters.tags, !filterTags.isEmpty {
            filteredExpenses = filteredExpenses.filter { expense in
                guard let expenseTags = expense.tags else { return false }
                // Check if any of the filter tags match any of the expense tags
                return filterTags.contains { filterTag in
                    expenseTags.contains { expenseTag in
                        expenseTag.localizedCaseInsensitiveContains(filterTag)
                    }
                }
            }
        }
        
        // Apply shared filter
        if let isShared = filters.isShared {
            filteredExpenses = filteredExpenses.filter { $0.isShared == isShared }
        }
        
        // Sort by date (newest first)
        filteredExpenses.sort { $0.expenseDate > $1.expenseDate }
    }
    
    func getExpenseSummary(year: Int, month: Int) async -> ExpenseSummary? {
        do {
            return try await apiService.getExpenseSummary(year: year, month: month)
        } catch {
            print("Failed to fetch expense summary: \(error)")
            return nil
        }
    }
    
    func getCategoryName(for categoryId: String?) -> String {
        guard let categoryId = categoryId else { return "Uncategorized" }
        return categories.first { $0.id == categoryId }?.name ?? "Unknown"
    }
    
    // MARK: - Helper Methods
    
    func clearFilters() {
        filters = ExpenseFilters()
        searchText = ""
        applyFilters()
    }
    
    func hasActiveFilters() -> Bool {
        return filters.startDate != nil ||
               filters.endDate != nil ||
               filters.categoryId != nil ||
               filters.subcategoryId != nil ||
               filters.currency != nil ||
               filters.paymentMethod != nil ||
               filters.minAmount != nil ||
               filters.maxAmount != nil ||
               filters.isShared != nil ||
               !(filters.search?.isEmpty ?? true) ||
               !(filters.tags?.isEmpty ?? true) ||
               !searchText.isEmpty
    }
    
    func getExpensesByCategory() -> [String: [Expense]] {
        return Dictionary(grouping: filteredExpenses) { expense in
            expense.categoryId ?? "uncategorized"
        }
    }
    
    func getExpensesByMonth() -> [String: [Expense]] {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM"
        
        return Dictionary(grouping: filteredExpenses) { expense in
            formatter.string(from: expense.expenseDate)
        }
    }
    
    func getTotalForCategory(_ categoryId: String) -> Double {
        return filteredExpenses
            .filter { $0.categoryId == categoryId || $0.subcategoryId == categoryId }
            .reduce(0) { $0 + ($1.amountInBaseCurrency ?? $1.amount) }
    }
    
    func getAverageExpenseAmount() -> Double {
        guard !filteredExpenses.isEmpty else { return 0 }
        return totalAmount / Double(filteredExpenses.count)
    }
    
    func getExpenseCount(for period: ExpensePeriod) -> Int {
        let now = Date()
        let calendar = Calendar.current
        
        switch period {
        case .today:
            let startOfDay = calendar.startOfDay(for: now)
            let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
            return expenses.filter { $0.expenseDate >= startOfDay && $0.expenseDate < endOfDay }.count
            
        case .thisWeek:
            let startOfWeek = calendar.dateInterval(of: .weekOfYear, for: now)?.start ?? now
            let endOfWeek = calendar.date(byAdding: .weekOfYear, value: 1, to: startOfWeek)!
            return expenses.filter { $0.expenseDate >= startOfWeek && $0.expenseDate < endOfWeek }.count
            
        case .thisMonth:
            return thisMonthExpenses.count
            
        case .thisYear:
            let startOfYear = calendar.dateInterval(of: .year, for: now)?.start ?? now
            let endOfYear = calendar.date(byAdding: .year, value: 1, to: startOfYear)!
            return expenses.filter { $0.expenseDate >= startOfYear && $0.expenseDate < endOfYear }.count
        }
    }
}

enum ExpensePeriod {
    case today
    case thisWeek
    case thisMonth
    case thisYear
}