import SwiftUI

// MARK: - Expenses View
struct ExpensesView: View {
    @EnvironmentObject var expenseStore: ExpenseStore
    @EnvironmentObject var categoryStore: CategoryStore
    @State private var showingAddExpense = false
    @State private var showingFilters = false
    
    var body: some View {
        NavigationView {
            List {
                ForEach(expenseStore.filteredExpenses) { expense in
                    ExpenseRowView(expense: expense)
                }
                .onDelete { indexSet in
                    for index in indexSet {
                        let expense = expenseStore.filteredExpenses[index]
                        Task {
                            await expenseStore.deleteExpense(id: expense.id)
                        }
                    }
                }
            }
            .searchable(text: $expenseStore.searchText)
            .navigationTitle("Expenses")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { showingFilters = true }) {
                        Image(systemName: "line.3.horizontal.decrease.circle")
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingAddExpense = true }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddExpense) {
                AddExpenseView()
            }
            .sheet(isPresented: $showingFilters) {
                ExpenseFiltersView()
            }
            .refreshable {
                await expenseStore.fetchExpenses()
            }
            .onAppear {
                Task {
                    await expenseStore.fetchExpenses()
                    await categoryStore.fetchCategories()
                }
            }
            .onChange(of: expenseStore.searchText) { _ in
                expenseStore.applyFilters()
            }
        }
    }
}

// MARK: - Add Expense View
struct AddExpenseView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var expenseStore: ExpenseStore
    @EnvironmentObject var authStore: AuthStore
    @EnvironmentObject var categoryStore: CategoryStore
    
    @State private var amount = ""
    @State private var description = ""
    @State private var selectedCategory: String = ""
    @State private var selectedPaymentMethod: PaymentMethod = .card
    @State private var expenseDate = Date()
    @State private var notes = ""
    @State private var vendor = ""
    
    var body: some View {
        NavigationView {
            Form {
                Section("Basic Information") {
                    TextField("Amount", text: $amount)
                        .keyboardType(.decimalPad)
                    
                    TextField("Description", text: $description)
                    
                    DatePicker("Date", selection: $expenseDate, displayedComponents: .date)
                }
                
                Section("Details") {
                    Picker("Category", selection: $selectedCategory) {
                        Text("None").tag("")
                        ForEach(categoryStore.categories) { category in
                            Text(category.name).tag(category.id)
                        }
                    }
                    
                    Picker("Payment Method", selection: $selectedPaymentMethod) {
                        ForEach(PaymentMethod.allCases, id: \.self) { method in
                            Label(method.displayName, systemImage: method.icon)
                                .tag(method)
                        }
                    }
                    
                    TextField("Vendor", text: $vendor)
                    TextField("Notes", text: $notes)
                }
            }
            .navigationTitle("Add Expense")
            .navigationBarItems(
                leading: Button("Cancel") { dismiss() },
                trailing: Button("Save") { saveExpense() }
                    .disabled(!isFormValid)
            )
        }
    }
    
    private var isFormValid: Bool {
        !amount.isEmpty && !description.isEmpty && Double(amount) != nil
    }
    
    private func saveExpense() {
        guard let amountValue = Double(amount) else { return }
        
        let request = CreateExpenseRequest(
            amount: amountValue,
            currency: authStore.user?.defaultCurrency ?? "EUR",
            description: description,
            expenseDate: expenseDate,
            categoryId: selectedCategory.isEmpty ? nil : selectedCategory,
            subcategoryId: nil,
            paymentMethod: selectedPaymentMethod,
            notes: notes.isEmpty ? nil : notes,
            location: nil,
            vendor: vendor.isEmpty ? nil : vendor,
            isShared: false,
            sharedWith: nil,
            tags: nil,
            amountInBaseCurrency: nil,
            exchangeRate: nil
        )
        
        Task {
            await expenseStore.createExpense(request)
            dismiss()
        }
    }
}

// MARK: - Expense Filters View
struct ExpenseFiltersView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var expenseStore: ExpenseStore
    
    var body: some View {
        NavigationView {
            Form {
                Section("Date Range") {
                    DatePicker("Start Date", 
                              selection: Binding(
                                get: { expenseStore.filters.startDate ?? Date() },
                                set: { expenseStore.filters.startDate = $0 }
                              ),
                              displayedComponents: .date)
                    
                    DatePicker("End Date",
                              selection: Binding(
                                get: { expenseStore.filters.endDate ?? Date() },
                                set: { expenseStore.filters.endDate = $0 }
                              ),
                              displayedComponents: .date)
                }
                
                Section {
                    Button("Apply Filters") {
                        Task {
                            await expenseStore.fetchExpenses()
                            dismiss()
                        }
                    }
                    
                    Button("Clear Filters") {
                        expenseStore.filters = ExpenseFilters()
                        Task {
                            await expenseStore.fetchExpenses()
                            dismiss()
                        }
                    }
                    .foregroundColor(.red)
                }
            }
            .navigationTitle("Filters")
            .navigationBarItems(trailing: Button("Done") { dismiss() })
        }
    }
}

// MARK: - Budgets View
struct BudgetsView: View {
    @EnvironmentObject var budgetStore: BudgetStore
    
    var body: some View {
        NavigationView {
            ScrollView {
                if budgetStore.budgets.isEmpty {
                    EmptyStateView(
                        icon: "chart.bar.doc.horizontal",
                        title: "No budgets yet",
                        message: "Create budgets to track your spending"
                    )
                    .padding(.top, 100)
                } else {
                    LazyVStack(spacing: 12) {
                        ForEach(budgetStore.budgets) { budget in
                            BudgetCardView(budget: budget)
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Budgets")
            .refreshable {
                await budgetStore.fetchBudgets()
                await budgetStore.fetchBudgetSummary()
            }
            .onAppear {
                Task {
                    await budgetStore.fetchBudgets()
                    await budgetStore.fetchBudgetSummary()
                }
            }
        }
    }
}

struct BudgetCardView: View {
    let budget: Budget
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(budget.name)
                    .font(.headline)
                Spacer()
                Text(budget.amount.formatted(currency: budget.currency))
                    .font(.subheadline)
            }
            
            Text(budget.periodType.displayName)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
}

// MARK: - Categories View
struct CategoriesView: View {
    @EnvironmentObject var categoryStore: CategoryStore
    
    var body: some View {
        NavigationView {
            List {
                ForEach(categoryStore.categoryTree) { category in
                    CategoryTreeRow(category: category)
                }
            }
            .navigationTitle("Categories")
            .refreshable {
                await categoryStore.fetchCategoryTree()
            }
            .onAppear {
                Task {
                    await categoryStore.fetchCategoryTree()
                }
            }
        }
    }
}

struct CategoryTreeRow: View {
    let category: CategoryTree
    @State private var isExpanded = false
    
    var body: some View {
        VStack(alignment: .leading) {
            HStack {
                Image(systemName: category.systemIcon)
                    .foregroundColor(category.displayColor)
                
                VStack(alignment: .leading) {
                    Text(category.name)
                        .font(.subheadline)
                    
                    HStack {
                        Text("\(category.expenseCount) expenses")
                        Text("•")
                        Text(category.totalAmount.formatted(decimals: 2))
                    }
                    .font(.caption)
                    .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if !category.subcategories.isEmpty {
                    Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                        .foregroundColor(.secondary)
                }
            }
            .contentShape(Rectangle())
            .onTapGesture {
                withAnimation {
                    isExpanded.toggle()
                }
            }
            
            if isExpanded {
                ForEach(category.subcategories) { subcategory in
                    HStack {
                        Spacer().frame(width: 20)
                        CategoryTreeRow(category: subcategory)
                    }
                }
            }
        }
    }
}

// MARK: - Settings View
struct SettingsView: View {
    @EnvironmentObject var authStore: AuthStore
    
    var body: some View {
        NavigationView {
            Form {
                Section("Profile") {
                    HStack {
                        Text("Name")
                        Spacer()
                        Text(authStore.user?.fullName ?? "")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("Email")
                        Spacer()
                        Text(authStore.user?.email ?? "")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("Currency")
                        Spacer()
                        Text(authStore.user?.defaultCurrency ?? "")
                            .foregroundColor(.secondary)
                    }
                }
                
                Section {
                    Button("Sign Out") {
                        Task {
                            await authStore.logout()
                        }
                    }
                    .foregroundColor(.red)
                }
            }
            .navigationTitle("Settings")
        }
    }
}