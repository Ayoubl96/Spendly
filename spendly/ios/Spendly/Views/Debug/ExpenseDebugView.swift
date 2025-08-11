import SwiftUI

struct ExpenseDebugView: View {
    @EnvironmentObject var expenseStore: ExpenseStore
    @EnvironmentObject var authStore: AuthStore
    @State private var debugInfo = ""
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Authentication Status
                    Group {
                        Text("Authentication Status")
                            .font(.headline)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("Is Authenticated:")
                                Spacer()
                                Text(authStore.isAuthenticated ? "✅ Yes" : "❌ No")
                                    .foregroundColor(authStore.isAuthenticated ? .green : .red)
                            }
                            
                            if let user = authStore.user {
                                HStack {
                                    Text("User Email:")
                                    Spacer()
                                    Text(user.email)
                                        .font(.caption)
                                }
                                
                                HStack {
                                    Text("User ID:")
                                    Spacer()
                                    Text(user.id)
                                        .font(.caption)
                                }
                            }
                        }
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(8)
                    }
                    
                    // API Configuration
                    Group {
                        Text("API Configuration")
                            .font(.headline)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("Base URL:")
                                Spacer()
                            }
                            Text("https://spendly-api.ayoublefhim.com/api/v1")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(8)
                    }
                    
                    // Expense Store Status
                    Group {
                        Text("Expense Store Status")
                            .font(.headline)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("Is Loading:")
                                Spacer()
                                Text(expenseStore.isLoading ? "🔄 Yes" : "❌ No")
                                    .foregroundColor(expenseStore.isLoading ? .orange : .primary)
                            }
                            
                            HStack {
                                Text("Total Expenses:")
                                Spacer()
                                Text("\(expenseStore.expenses.count)")
                            }
                            
                            HStack {
                                Text("Filtered Expenses:")
                                Spacer()
                                Text("\(expenseStore.filteredExpenses.count)")
                            }
                            
                            if let error = expenseStore.error {
                                HStack {
                                    Text("Error:")
                                    Spacer()
                                }
                                Text(error)
                                    .font(.caption)
                                    .foregroundColor(.red)
                            }
                            
                            HStack {
                                Text("Has Active Filters:")
                                Spacer()
                                Text(expenseStore.hasActiveFilters() ? "✅ Yes" : "❌ No")
                            }
                        }
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(8)
                    }
                    
                    // Sample Expenses
                    if !expenseStore.expenses.isEmpty {
                        Group {
                            Text("Sample Expenses")
                                .font(.headline)
                            
                            VStack(alignment: .leading, spacing: 8) {
                                ForEach(expenseStore.expenses.prefix(3)) { expense in
                                    VStack(alignment: .leading, spacing: 4) {
                                        HStack {
                                            Text(expense.description)
                                                .font(.subheadline)
                                                .fontWeight(.medium)
                                            Spacer()
                                            Text(expense.amount.formatted(currency: expense.currency))
                                                .font(.subheadline)
                                        }
                                        
                                        HStack {
                                            Text("Date: \(expense.expenseDate.formatted(date: .abbreviated, time: .omitted))")
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                            Spacer()
                                            Text("ID: \(expense.id)")
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                    }
                                    .padding(.vertical, 4)
                                    
                                    if expense.id != expenseStore.expenses.prefix(3).last?.id {
                                        Divider()
                                    }
                                }
                            }
                            .padding()
                            .background(Color(.secondarySystemBackground))
                            .cornerRadius(8)
                        }
                    }
                    
                    // Actions
                    Group {
                        Text("Debug Actions")
                            .font(.headline)
                        
                        VStack(spacing: 12) {
                            Button("Refresh Expenses") {
                                Task {
                                    await expenseStore.fetchExpenses()
                                }
                            }
                            .buttonStyle(.borderedProminent)
                            
                            Button("Clear Filters") {
                                expenseStore.clearFilters()
                            }
                            .buttonStyle(.bordered)
                            
                            Button("Test API Connection") {
                                Task {
                                    await testAPIConnection()
                                }
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                    
                    // Debug Output
                    if !debugInfo.isEmpty {
                        Group {
                            Text("Debug Output")
                                .font(.headline)
                            
                            Text(debugInfo)
                                .font(.caption)
                                .padding()
                                .background(Color(.secondarySystemBackground))
                                .cornerRadius(8)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Debug Info")
            .onAppear {
                Task {
                    await expenseStore.fetchExpenses()
                }
            }
        }
    }
    
    private func testAPIConnection() async {
        do {
            debugInfo = "Testing API connection...\n"
            
            // Test with current filters
            let expenses = try await APIService.shared.getExpenses(filters: expenseStore.filters)
            debugInfo += "✅ API call successful\n"
            debugInfo += "📊 Received \(expenses.count) expenses\n"
            
            if expenses.isEmpty {
                debugInfo += "⚠️ No expenses returned from API\n"
                debugInfo += "💡 This could mean:\n"
                debugInfo += "  - No expenses exist for this user\n"
                debugInfo += "  - Filters are too restrictive\n"
                debugInfo += "  - User has no permissions\n"
            } else {
                debugInfo += "📝 First expense: \(expenses.first?.description ?? "N/A")\n"
            }
            
        } catch {
            debugInfo += "❌ API call failed: \(error.localizedDescription)\n"
            
            if let apiError = error as? APIError {
                switch apiError {
                case .unauthorized:
                    debugInfo += "🔐 Authentication issue - please login again\n"
                case .networkError(let message):
                    debugInfo += "🌐 Network error: \(message)\n"
                case .decodingError:
                    debugInfo += "📦 Data parsing error - server response format issue\n"
                case .serverError(let message):
                    debugInfo += "🖥️ Server error: \(message)\n"
                default:
                    debugInfo += "❓ Unknown error type\n"
                }
            }
        }
    }
}

// Extension to format currency
extension Double {
    func formatted(currency: String) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: self)) ?? "\(currency) \(self)"
    }
}

#Preview {
    ExpenseDebugView()
        .environmentObject(ExpenseStore())
        .environmentObject(AuthStore())
}
