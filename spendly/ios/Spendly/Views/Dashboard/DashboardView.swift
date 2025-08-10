import SwiftUI
import Charts

struct DashboardView: View {
    @EnvironmentObject var authStore: AuthStore
    @EnvironmentObject var expenseStore: ExpenseStore
    @EnvironmentObject var budgetStore: BudgetStore
    @State private var showingAddExpense = false
    @State private var loadDataTask: Task<Void, Never>?
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Welcome Header
                    HStack {
                        VStack(alignment: .leading) {
                            Text("Welcome back,")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Text(authStore.user?.firstName ?? "User")
                                .font(.title2)
                                .fontWeight(.bold)
                        }
                        Spacer()
                        Button(action: { showingAddExpense = true }) {
                            Image(systemName: "plus.circle.fill")
                                .font(.title)
                                .foregroundColor(.blue)
                        }
                    }
                    .padding(.horizontal)
                    
                    // Summary Cards
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                        SummaryCard(
                            title: "This Month",
                            amount: expenseStore.thisMonthTotal,
                            currency: authStore.user?.defaultCurrency ?? "EUR",
                            icon: "calendar",
                            color: .blue
                        )
                        
                        SummaryCard(
                            title: "Total Expenses",
                            amount: expenseStore.totalAmount,
                            currency: authStore.user?.defaultCurrency ?? "EUR",
                            icon: "creditcard",
                            color: .green
                        )
                        
                        SummaryCard(
                            title: "Budget Used",
                            amount: budgetStore.totalSpent,
                            currency: authStore.user?.defaultCurrency ?? "EUR",
                            icon: "chart.pie",
                            color: .orange,
                            subtitle: "of \(budgetStore.totalBudget.formatted(currency: authStore.user?.defaultCurrency ?? "EUR"))"
                        )
                        
                        SummaryCard(
                            title: "Remaining",
                            amount: budgetStore.totalRemaining,
                            currency: authStore.user?.defaultCurrency ?? "EUR",
                            icon: "banknote",
                            color: budgetStore.totalRemaining > 0 ? .green : .red
                        )
                    }
                    .padding(.horizontal)
                    
                    // Recent Expenses
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Recent Expenses")
                                .font(.headline)
                            Spacer()
                            NavigationLink(destination: ExpensesView()) {
                                Text("See All")
                                    .font(.caption)
                                    .foregroundColor(.blue)
                            }
                        }
                        
                        if expenseStore.expenses.isEmpty {
                            EmptyStateView(
                                icon: "creditcard.circle",
                                title: "No expenses yet",
                                message: "Start tracking your expenses by tapping the + button"
                            )
                            .frame(height: 150)
                        } else {
                            ForEach(expenseStore.expenses.prefix(5)) { expense in
                                ExpenseRowView(expense: expense)
                            }
                        }
                    }
                    .padding(.horizontal)
                    
                    // Budget Overview
                    if let budgetSummary = budgetStore.budgetSummary {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Budget Overview")
                                .font(.headline)
                            
                            BudgetProgressView(summary: budgetSummary)
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Dashboard")
            .refreshable {
                loadDataTask?.cancel()
                loadDataTask = Task {
                    await loadData()
                }
                await loadDataTask?.value
            }
            .sheet(isPresented: $showingAddExpense) {
                AddExpenseView()
            }
            .onAppear {
                loadDataTask?.cancel()
                loadDataTask = Task {
                    await loadData()
                }
            }
            .onDisappear {
                loadDataTask?.cancel()
                loadDataTask = nil
            }
        }
    }
    
    private func loadData() async {
        // Run API calls in parallel to avoid cancellation issues
        async let expensesTask = expenseStore.fetchExpenses()
        async let categoriesTask = expenseStore.fetchCategories()
        async let currenciesTask = expenseStore.fetchCurrencies()
        async let budgetSummaryTask = budgetStore.fetchBudgetSummary()
        
        // Wait for all tasks to complete
        do {
            await expensesTask
            await categoriesTask
            await currenciesTask
            await budgetSummaryTask
        } catch {
            // Handle task cancellation gracefully
            if !Task.isCancelled {
                print("Error loading dashboard data: \(error)")
            }
        }
    }
}

struct SummaryCard: View {
    let title: String
    let amount: Double
    let currency: String
    let icon: String
    let color: Color
    var subtitle: String? = nil
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Spacer()
            }
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(amount.formatted(currency: currency))
                .font(.headline)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
            
            if let subtitle = subtitle {
                Text(subtitle)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
}

struct ExpenseRowView: View {
    let expense: Expense
    @EnvironmentObject var categoryStore: CategoryStore
    
    var body: some View {
        HStack {
            Image(systemName: categoryStore.getCategoryIcon(for: expense.categoryId))
                .foregroundColor(categoryStore.getCategoryColor(for: expense.categoryId))
                .frame(width: 40, height: 40)
                .background(categoryStore.getCategoryColor(for: expense.categoryId).opacity(0.1))
                .cornerRadius(8)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(expense.description)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                HStack {
                    Text(categoryStore.getCategoryName(for: expense.categoryId))
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text("•")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text(expense.expenseDate.shortDate)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            Text(expense.amount.formatted(currency: expense.currency))
                .font(.subheadline)
                .fontWeight(.semibold)
        }
        .padding(.vertical, 8)
    }
}

struct BudgetProgressView: View {
    let summary: BudgetSummary
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("\(summary.totalSpent.formatted(decimals: 0))")
                    .font(.headline)
                Text("of \(summary.totalBudget.formatted(decimals: 0))")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Text(summary.overallPercentage.percentage)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(progressColor(for: summary.overallStatus))
            }
            
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.2))
                        .frame(height: 8)
                    
                    RoundedRectangle(cornerRadius: 4)
                        .fill(progressColor(for: summary.overallStatus))
                        .frame(
                            width: min(geometry.size.width * (summary.overallPercentage / 100), geometry.size.width),
                            height: 8
                        )
                }
            }
            .frame(height: 8)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
    
    private func progressColor(for status: BudgetStatus) -> Color {
        switch status {
        case .onTrack: return .green
        case .warning: return .orange
        case .overBudget: return .red
        }
    }
}

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 50))
                .foregroundColor(.gray)
            
            Text(title)
                .font(.headline)
                .foregroundColor(.primary)
            
            Text(message)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding()
    }
}

#Preview {
    DashboardView()
        .environmentObject(AuthStore())
        .environmentObject(ExpenseStore())
        .environmentObject(BudgetStore())
        .environmentObject(CategoryStore())
}