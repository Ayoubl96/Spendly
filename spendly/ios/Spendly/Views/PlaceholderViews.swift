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
                Text(String(format: "%.2f %@", budget.amount, budget.currency))
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
    @State private var showingAddCategory = false
    @State private var selectedCategory: Category?
    @State private var showingEditCategory = false
    @State private var isRefreshing = false
    @State private var successMessage: String?
    @State private var showingDeleteConfirmation = false
    @State private var categoryToDelete: CategoryTree?
    
    var body: some View {
        NavigationView {
            VStack {
                if categoryStore.isLoading && !isRefreshing {
                    ProgressView("Loading categories...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if categoryStore.categoryTree.isEmpty {
                    EmptyStateView(
                        icon: "folder",
                        title: "No Categories",
                        message: "You haven't created any categories yet. Add your first category to start organizing your expenses."
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(categoryStore.categoryTree) { category in
                                CategoryTreeRow(
                                    category: category,
                                                                    onEdit: { categoryId in
                                    Task {
                                        if let category = await categoryStore.getCategoryById(id: categoryId) {
                                            selectedCategory = category
                                            showingEditCategory = true
                                        }
                                    }
                                },
                                    onDelete: { categoryId in
                                        if let cat = categoryStore.categoryTree.first(where: { $0.id == categoryId }) {
                                            categoryToDelete = cat
                                            showingDeleteConfirmation = true
                                        }
                                    }
                                )
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 8)
                    }
                    .refreshable {
                        await performRefresh()
                    }
                }
            }
            .navigationTitle("Categories")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showingAddCategory = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .onAppear {
                if categoryStore.categoryTree.isEmpty {
                    Task {
                        await categoryStore.fetchCategoryTree()
                    }
                }
            }
            .sheet(isPresented: $showingAddCategory) {
                CategoryFormView(onSuccess: { message in
                    successMessage = message
                })
                .environmentObject(categoryStore)
            }
            .sheet(isPresented: $showingEditCategory) {
                if let category = selectedCategory {
                    CategoryFormView(editingCategory: category, onSuccess: { message in
                        successMessage = message
                    })
                    .environmentObject(categoryStore)
                }
            }
            .alert("Delete Category", isPresented: $showingDeleteConfirmation) {
                Button("Cancel", role: .cancel) {
                    categoryToDelete = nil
                }
                Button("Delete", role: .destructive) {
                    if let category = categoryToDelete {
                        Task {
                            await deleteCategory(category)
                        }
                    }
                }
            } message: {
                if let category = categoryToDelete {
                    Text("Are you sure you want to delete '\(category.name)'? This action cannot be undone.")
                }
            }
            .alert("Error", isPresented: .constant(categoryStore.error != nil && successMessage == nil)) {
                Button("OK") {
                    categoryStore.error = nil
                }
            } message: {
                if let error = categoryStore.error {
                    Text(error)
                }
            }
            .alert("Success", isPresented: .constant(successMessage != nil)) {
                Button("OK") {
                    successMessage = nil
                }
            } message: {
                if let message = successMessage {
                    Text(message)
                }
            }
        }
    }
    
    private func performRefresh() async {
        guard !isRefreshing else { return }
        isRefreshing = true
        await categoryStore.fetchCategoryTree()
        isRefreshing = false
    }
    
    private func deleteCategory(_ category: CategoryTree) async {
        let response = await categoryStore.deleteCategory(id: category.id)
        categoryToDelete = nil
        
        if let response = response {
            if response.reassignedExpenses > 0 {
                successMessage = "Category deleted successfully. \(response.reassignedExpenses) expenses were reassigned."
            } else {
                successMessage = "Category deleted successfully."
            }
        }
    }
}

struct CategoryTreeRow: View {
    let category: CategoryTree
    let onEdit: ((String) -> Void)?
    let onDelete: ((String) -> Void)?
    @State private var isExpanded = false
    @State private var showingActionSheet = false
    
    init(category: CategoryTree, onEdit: ((String) -> Void)? = nil, onDelete: ((String) -> Void)? = nil) {
        self.category = category
        self.onEdit = onEdit
        self.onDelete = onDelete
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 16) {
                // Category Icon
                Image(systemName: category.systemIcon)
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(category.displayColor)
                            .shadow(color: category.displayColor.opacity(0.3), radius: 4, x: 0, y: 2)
                    )
                
                // Category Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(category.name)
                        .font(.system(.headline, design: .rounded))
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                    
                    HStack(spacing: 8) {
                        HStack(spacing: 4) {
                            Image(systemName: "doc.text")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                            Text("\(category.expenseCount)")
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                        }
                        
                        HStack(spacing: 4) {
                            Image(systemName: "dollarsign.circle")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                            Text(String(format: "%.2f", category.totalAmountValue))
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                Spacer()
                
                // Action Buttons
                HStack(spacing: 12) {
                    // Edit Button
                    if let onEdit = onEdit {
                        Button(action: {
                            onEdit(category.id)
                        }) {
                            Image(systemName: "pencil")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.blue)
                                .frame(width: 36, height: 36)
                                .background(
                                    Circle()
                                        .fill(Color.blue.opacity(0.1))
                                )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    
                    // Expand/Collapse Button (only for categories with subcategories)
                    if !category.subcategories.isEmpty {
                        Button(action: {
                            withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                                isExpanded.toggle()
                            }
                        }) {
                            Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.secondary)
                                .frame(width: 32, height: 32)
                                .background(
                                    Circle()
                                        .fill(Color.gray.opacity(0.1))
                                )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(.systemBackground))
                    .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color(.systemGray5), lineWidth: 1)
            )
            .contentShape(Rectangle())
            .onTapGesture {
                if category.subcategories.isEmpty {
                    // If no subcategories, tap to edit
                    onEdit?(category.id)
                } else {
                    // If has subcategories, tap to expand
                    withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                        isExpanded.toggle()
                    }
                }
            }
            .contextMenu {
                if let onEdit = onEdit {
                    Button(action: {
                        onEdit(category.id)
                    }) {
                        Label("Edit Category", systemImage: "pencil")
                    }
                }
                
                if let onDelete = onDelete {
                    Button(role: .destructive, action: {
                        onDelete(category.id)
                    }) {
                        Label("Delete Category", systemImage: "trash")
                    }
                }
            }
            .swipeActions(edge: .leading) {
                if let onEdit = onEdit {
                    Button {
                        onEdit(category.id)
                    } label: {
                        Label("Edit", systemImage: "pencil")
                    }
                    .tint(.blue)
                }
            }
            .swipeActions(edge: .trailing) {
                if let onDelete = onDelete {
                    Button(role: .destructive) {
                        onDelete(category.id)
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                }
            }
            
            // Subcategories
            if isExpanded && !category.subcategories.isEmpty {
                VStack(spacing: 8) {
                    ForEach(category.subcategories) { subcategory in
                        HStack {
                            Spacer().frame(width: 24)
                            CategoryTreeRow(category: subcategory, onEdit: onEdit, onDelete: onDelete)
                        }
                    }
                }
                .padding(.top, 12)
                .padding(.leading, 20)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(.systemGray6).opacity(0.5))
                        .padding(.horizontal, 8)
                )
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