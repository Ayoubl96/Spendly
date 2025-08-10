import Foundation
import SwiftUI

@MainActor
class BudgetStore: ObservableObject {
    @Published var budgets: [Budget] = []
    @Published var budgetGroups: [BudgetGroup] = []
    @Published var budgetSummary: BudgetSummary?
    @Published var currentBudget: Budget?
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiService = APIService.shared
    
    var activeBudgets: [Budget] {
        budgets.filter { $0.isActive }
    }
    
    var totalBudget: Double {
        budgetSummary?.totalBudget ?? 0
    }
    
    var totalSpent: Double {
        budgetSummary?.totalSpent ?? 0
    }
    
    var totalRemaining: Double {
        budgetSummary?.totalRemaining ?? 0
    }
    
    func fetchBudgets() async {
        isLoading = true
        error = nil
        
        do {
            budgets = try await apiService.getBudgets()
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func fetchBudgetSummary() async {
        isLoading = true
        error = nil
        
        do {
            budgetSummary = try await apiService.getBudgetSummary()
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func createBudget(_ request: CreateBudgetRequest) async {
        isLoading = true
        error = nil
        
        do {
            let newBudget = try await apiService.createBudget(request)
            budgets.append(newBudget)
            await fetchBudgetSummary()
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func updateBudget(id: String, request: CreateBudgetRequest) async {
        isLoading = true
        error = nil
        
        do {
            let updatedBudget = try await apiService.updateBudget(id: id, budget: request)
            if let index = budgets.firstIndex(where: { $0.id == id }) {
                budgets[index] = updatedBudget
            }
            await fetchBudgetSummary()
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func deleteBudget(id: String) async {
        isLoading = true
        error = nil
        
        do {
            try await apiService.deleteBudget(id: id)
            budgets.removeAll { $0.id == id }
            await fetchBudgetSummary()
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func fetchBudgetGroups() async {
        isLoading = true
        error = nil
        
        do {
            budgetGroups = try await apiService.getBudgetGroups()
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func createBudgetGroup(_ request: CreateBudgetGroupRequest) async {
        isLoading = true
        error = nil
        
        do {
            let newGroup = try await apiService.createBudgetGroup(request)
            budgetGroups.append(newGroup)
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func getBudgetPerformance(id: String) async -> BudgetPerformance? {
        do {
            return try await apiService.getBudgetPerformance(id: id)
        } catch {
            print("Failed to fetch budget performance: \(error)")
            return nil
        }
    }
}