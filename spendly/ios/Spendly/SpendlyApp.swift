import SwiftUI

@main
struct SpendlyApp: App {
    @StateObject private var authStore = AuthStore()
    @StateObject private var expenseStore = ExpenseStore()
    @StateObject private var budgetStore = BudgetStore()
    @StateObject private var categoryStore = CategoryStore()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authStore)
                .environmentObject(expenseStore)
                .environmentObject(budgetStore)
                .environmentObject(categoryStore)
                .onAppear {
                    setupAppearance()
                }
        }
    }
    
    private func setupAppearance() {
        // Configure global appearance
        UINavigationBar.appearance().largeTitleTextAttributes = [
            .foregroundColor: UIColor.label
        ]
        UINavigationBar.appearance().titleTextAttributes = [
            .foregroundColor: UIColor.label
        ]
    }
}