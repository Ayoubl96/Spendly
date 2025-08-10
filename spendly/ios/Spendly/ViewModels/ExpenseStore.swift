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
        
        // Apply search filter
        if !searchText.isEmpty {
            filteredExpenses = filteredExpenses.filter { expense in
                expense.description.localizedCaseInsensitiveContains(searchText) ||
                (expense.vendor?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (expense.notes?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }
        
        // Apply date filters
        if let startDate = filters.startDate {
            filteredExpenses = filteredExpenses.filter { $0.expenseDate >= startDate }
        }
        
        if let endDate = filters.endDate {
            filteredExpenses = filteredExpenses.filter { $0.expenseDate <= endDate }
        }
        
        // Apply category filter
        if let categoryId = filters.categoryId {
            filteredExpenses = filteredExpenses.filter { 
                $0.categoryId == categoryId || $0.subcategoryId == categoryId
            }
        }
        
        // Apply currency filter
        if let currency = filters.currency {
            filteredExpenses = filteredExpenses.filter { $0.currency == currency }
        }
        
        // Apply payment method filter
        if let paymentMethod = filters.paymentMethod {
            filteredExpenses = filteredExpenses.filter { $0.paymentMethod == paymentMethod }
        }
        
        // Apply amount filters
        if let minAmount = filters.minAmount {
            filteredExpenses = filteredExpenses.filter { $0.amount >= minAmount }
        }
        
        if let maxAmount = filters.maxAmount {
            filteredExpenses = filteredExpenses.filter { $0.amount <= maxAmount }
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
}