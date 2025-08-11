import SwiftUI

// MARK: - Expenses View
struct ExpensesView: View {
    @EnvironmentObject var expenseStore: ExpenseStore
    @EnvironmentObject var categoryStore: CategoryStore
    @State private var showingAddExpense = false
    @State private var showingFilters = false
    @State private var selectedExpense: Expense?
    @State private var editingExpense: Expense?
    @State private var viewMode: ExpenseViewMode = .list
    @State private var showingDeleteAlert = false
    @State private var expenseToDelete: Expense?
    
    enum ExpenseViewMode {
        case list, summary
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // View Mode Selector
                Picker("View Mode", selection: $viewMode) {
                    HStack {
                        Image(systemName: "list.bullet")
                        Text("List")
                    }.tag(ExpenseViewMode.list)
                    
                    HStack {
                        Image(systemName: "chart.bar")
                        Text("Summary")
                    }.tag(ExpenseViewMode.summary)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                
                // Content based on view mode
                if viewMode == .list {
                    expenseListView
                } else {
                    expenseSummaryView
                }
            }
            .navigationTitle("Expenses")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { showingFilters = true }) {
                        Image(systemName: "line.3.horizontal.decrease.circle")
                            .foregroundColor(hasActiveFilters ? .blue : .primary)
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
            // TODO: Add back when views are included in project
            // .sheet(item: $selectedExpense) { expense in
            //     ExpenseDetailView(expense: expense)
            // }
            // .sheet(item: $editingExpense) { expense in
            //     EditExpenseView(expense: expense)
            // }
            .alert("Delete Expense", isPresented: $showingDeleteAlert) {
                Button("Cancel", role: .cancel) { 
                    expenseToDelete = nil 
                }
                Button("Delete", role: .destructive) {
                    if let expense = expenseToDelete {
                        Task {
                            await expenseStore.deleteExpense(id: expense.id)
                        }
                    }
                    expenseToDelete = nil
                }
            } message: {
                Text("Are you sure you want to delete this expense? This action cannot be undone.")
            }
            .refreshable {
                await loadData()
            }
            .onAppear {
                Task {
                    await loadData()
                }
            }
            .onChange(of: expenseStore.searchText) { _ in
                expenseStore.applyFilters()
            }
        }
    }
    
    private var expenseListView: some View {
        Group {
            if expenseStore.isLoading && expenseStore.filteredExpenses.isEmpty {
                VStack {
                    ProgressView("Loading expenses...")
                        .padding()
                    Spacer()
                }
            } else if expenseStore.filteredExpenses.isEmpty {
                emptyStateView
            } else {
                List {
                    // Summary header
                    if !expenseStore.filteredExpenses.isEmpty {
                        summaryHeaderView
                            .listRowBackground(Color.clear)
                            .listRowInsets(EdgeInsets())
                    }
                    
                    // Expense list
                    ForEach(expenseStore.filteredExpenses) { expense in
                        ExpenseRowView(
                            expense: expense,
                            onTap: nil, // TODO: Re-enable when ExpenseDetailView is added to project
                            onEdit: nil, // TODO: Re-enable when EditExpenseView is added to project  
                            onDelete: { 
                                expenseToDelete = $0
                                showingDeleteAlert = true
                            }
                        )
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                    }
                    .onDelete(perform: deleteExpenses)
                }
                .listStyle(PlainListStyle())
                .searchable(text: $expenseStore.searchText, prompt: "Search expenses...")
            }
        }
        .overlay(
            Group {
                if expenseStore.isLoading && !expenseStore.filteredExpenses.isEmpty {
                    VStack {
                        Spacer()
                        HStack {
                            ProgressView()
                                .scaleEffect(0.8)
                            Text("Updating...")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(12)
                        .shadow(radius: 2)
                        .padding()
                    }
                }
            }
        )
    }
    
    private var expenseSummaryView: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                summaryHeaderView
                // TODO: Add back when CategorySummaryView is included in project
                Text("Category Summary View Coming Soon")
                    .foregroundColor(.secondary)
                    .padding()
            }
            .padding()
        }
    }
    
    private var summaryHeaderView: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Total Expenses")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text(expenseStore.totalAmount.formatted(currency: "EUR"))
                        .font(.title2)
                        .fontWeight(.bold)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("Count")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text("\(expenseStore.filteredExpenses.count)")
                        .font(.title2)
                        .fontWeight(.bold)
                }
            }
            
            if hasActiveFilters {
                HStack {
                    Image(systemName: "line.3.horizontal.decrease.circle.fill")
                        .foregroundColor(.blue)
                    Text("Filters applied")
                        .font(.caption)
                        .foregroundColor(.blue)
                    Spacer()
                    Button("Clear") {
                        expenseStore.clearFilters()
                    }
                    .font(.caption)
                    .foregroundColor(.blue)
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.secondarySystemBackground))
        )
        .padding(.horizontal)
    }
    
    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "creditcard.circle")
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            VStack(spacing: 8) {
                Text("No expenses found")
                    .font(.headline)
                
                Text(hasActiveFilters 
                     ? "Try adjusting your filters or add a new expense to get started."
                     : "Start tracking your expenses by adding your first transaction.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            
            // Debug info
            VStack(spacing: 4) {
                Text("Debug Info:")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.orange)
                
                Text("Total expenses: \(expenseStore.expenses.count)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text("Filtered expenses: \(expenseStore.filteredExpenses.count)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text("Loading: \(expenseStore.isLoading ? "Yes" : "No")")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                if let error = expenseStore.error {
                    Text("Error: \(error)")
                        .font(.caption)
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                }
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(8)
            
            HStack(spacing: 16) {
                Button("Add Your First Expense") {
                    showingAddExpense = true
                }
                .buttonStyle(.borderedProminent)
                
                Button("Refresh") {
                    Task {
                        await loadData()
                    }
                }
                .buttonStyle(.bordered)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var hasActiveFilters: Bool {
        expenseStore.hasActiveFilters()
    }
    
    private func loadData() async {
        await expenseStore.fetchExpenses()
        await categoryStore.fetchCategories()
    }
    
    private func deleteExpenses(offsets: IndexSet) {
        Task {
            for index in offsets {
                let expense = expenseStore.filteredExpenses[index]
                await expenseStore.deleteExpense(id: expense.id)
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
    @State private var selectedPaymentMethod: LegacyPaymentMethod = .card
    @State private var expenseDate = Date()
    @State private var notes = ""
    @State private var vendor = ""
    
    var body: some View {
        NavigationView {
            Form {
                basicInformationSection
                detailsSection
            }
            .navigationTitle("Add Expense")
            .navigationBarItems(
                leading: Button("Cancel") { dismiss() },
                trailing: Button("Save") { saveExpense() }
                    .disabled(!isFormValid)
            )
        }
    }
    
    private var basicInformationSection: some View {
        Section("Basic Information") {
            TextField("Amount", text: $amount)
                .keyboardType(.decimalPad)
            
            TextField("Description", text: $description)
            
            DatePicker("Date", selection: $expenseDate, displayedComponents: .date)
        }
    }
    
    private var detailsSection: some View {
        Section(header: Text("Details")) {
            categoryPicker
            paymentMethodPicker
            TextField("Vendor", text: $vendor)
            TextField("Notes", text: $notes)
        }
    }
    
    private var categoryPicker: some View {
        Picker("Category", selection: $selectedCategory) {
            Text("None").tag("")
            ForEach(categoryStore.categories) { category in
                Text(category.name).tag(category.id)
            }
        }
    }
    
    private var paymentMethodPicker: some View {
        Picker("Payment Method", selection: $selectedPaymentMethod) {
            ForEach(LegacyPaymentMethod.allCases, id: \.self) { method in
                Text(method.displayName).tag(method)
            }
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
            paymentMethodId: nil,
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
    @EnvironmentObject var categoryStore: CategoryStore
    @State private var tempFilters = ExpenseFilters()
    @State private var minAmountText = ""
    @State private var maxAmountText = ""
    @State private var searchText = ""
    @State private var tagsText = ""
    
    var body: some View {
        NavigationView {
            Form {
                // Date Range Section
                Section("Date Range") {
                    Toggle("Filter by Start Date", isOn: Binding(
                        get: { tempFilters.startDate != nil },
                        set: { newValue in
                            if newValue {
                                tempFilters.startDate = Date()
                            } else {
                                tempFilters.startDate = nil
                            }
                        }
                    ))
                    
                    if tempFilters.startDate != nil {
                        DatePicker("Start Date", 
                                  selection: Binding(
                                    get: { tempFilters.startDate ?? Date() },
                                    set: { tempFilters.startDate = $0 }
                                  ),
                                  displayedComponents: .date)
                    }
                    
                    Toggle("Filter by End Date", isOn: Binding(
                        get: { tempFilters.endDate != nil },
                        set: { newValue in
                            if newValue {
                                tempFilters.endDate = Date()
                            } else {
                                tempFilters.endDate = nil
                            }
                        }
                    ))
                    
                    if tempFilters.endDate != nil {
                        DatePicker("End Date",
                                  selection: Binding(
                                    get: { tempFilters.endDate ?? Date() },
                                    set: { tempFilters.endDate = $0 }
                                  ),
                                  displayedComponents: .date)
                    }
                }
                
                // Category Section
                Section("Category") {
                    Picker("Category", selection: Binding(
                        get: { tempFilters.categoryId ?? "" },
                        set: { newValue in
                            tempFilters.categoryId = newValue.isEmpty ? nil : newValue
                            if newValue.isEmpty {
                                tempFilters.subcategoryId = nil
                            }
                        }
                    )) {
                        Text("All Categories").tag("")
                        ForEach(categoryStore.categories.filter { $0.parentId == nil }) { category in
                            Text(category.name).tag(category.id)
                        }
                    }
                    
                    if let categoryId = tempFilters.categoryId, !categoryId.isEmpty {
                        Picker("Subcategory", selection: Binding(
                            get: { tempFilters.subcategoryId ?? "" },
                            set: { newValue in
                                tempFilters.subcategoryId = newValue.isEmpty ? nil : newValue
                            }
                        )) {
                            Text("All Subcategories").tag("")
                            ForEach(categoryStore.categories.filter { $0.parentId == categoryId }) { category in
                                Text(category.name).tag(category.id)
                            }
                        }
                    }
                }
                
                // Payment Method Section
                Section("Payment Method") {
                    Picker("Payment Method", selection: Binding(
                        get: { tempFilters.paymentMethod?.id ?? "" },
                        set: { newValue in
                            // This would need to be adapted based on UserPaymentMethod implementation
                            tempFilters.paymentMethod = nil
                        }
                    )) {
                        Text("All Payment Methods").tag("")
                        // TODO: Add user payment methods when available
                        ForEach(LegacyPaymentMethod.allCases, id: \.self) { method in
                            Text(method.displayName).tag(method.rawValue)
                        }
                    }
                }
                
                // Amount Range Section
                Section("Amount Range") {
                    HStack {
                        Text("Min Amount")
                        Spacer()
                        TextField("0.00", text: $minAmountText)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 100)
                    }
                    
                    HStack {
                        Text("Max Amount")
                        Spacer()
                        TextField("999.99", text: $maxAmountText)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 100)
                    }
                }
                
                // Currency Section
                Section("Currency") {
                    Picker("Currency", selection: Binding(
                        get: { tempFilters.currency ?? "" },
                        set: { newValue in
                            tempFilters.currency = newValue.isEmpty ? nil : newValue
                        }
                    )) {
                        Text("All Currencies").tag("")
                        // Common currencies
                        Text("EUR").tag("EUR")
                        Text("USD").tag("USD")
                        Text("GBP").tag("GBP")
                        Text("JPY").tag("JPY")
                    }
                }
                
                // Search Section
                Section("Search") {
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.secondary)
                        TextField("Search description, vendor, notes...", text: $searchText)
                            .textFieldStyle(PlainTextFieldStyle())
                    }
                }
                
                // Tags Section
                Section("Tags") {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "tag")
                                .foregroundColor(.secondary)
                            TextField("Enter tags separated by commas", text: $tagsText)
                                .textFieldStyle(PlainTextFieldStyle())
                        }
                        
                        Text("Enter tags separated by commas (e.g., business, travel, food)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                // Actions Section
                Section {
                    Button("Apply Filters") {
                        applyFilters()
                    }
                    .frame(maxWidth: .infinity)
                    .foregroundColor(.white)
                    .font(.headline)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(10)
                    
                    Button("Clear All Filters") {
                        clearFilters()
                    }
                    .frame(maxWidth: .infinity)
                    .foregroundColor(.red)
                    .font(.headline)
                    .padding()
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(10)
                }
                .listRowBackground(Color.clear)
            }
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Reset") {
                        resetToCurrentFilters()
                    }
                    .foregroundColor(.secondary)
                }
            }
            .onAppear {
                loadCurrentFilters()
            }
        }
    }
    
    private func loadCurrentFilters() {
        tempFilters = expenseStore.filters
        minAmountText = tempFilters.minAmount != nil ? String(tempFilters.minAmount!) : ""
        maxAmountText = tempFilters.maxAmount != nil ? String(tempFilters.maxAmount!) : ""
        searchText = tempFilters.search ?? ""
        tagsText = tempFilters.tags?.joined(separator: ", ") ?? ""
    }
    
    private func resetToCurrentFilters() {
        loadCurrentFilters()
    }
    
    private func applyFilters() {
        // Parse amount filters
        if !minAmountText.isEmpty, let minAmount = Double(minAmountText) {
            tempFilters.minAmount = minAmount
        } else {
            tempFilters.minAmount = nil
        }
        
        if !maxAmountText.isEmpty, let maxAmount = Double(maxAmountText) {
            tempFilters.maxAmount = maxAmount
        } else {
            tempFilters.maxAmount = nil
        }
        
        // Parse search
        tempFilters.search = searchText.isEmpty ? nil : searchText
        
        // Parse tags
        if !tagsText.isEmpty {
            let tags = tagsText.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
            tempFilters.tags = tags.isEmpty ? nil : tags
        } else {
            tempFilters.tags = nil
        }
        
        // Apply filters
        expenseStore.filters = tempFilters
        expenseStore.applyFilters()
        
        Task {
            await expenseStore.fetchExpenses()
        }
        
        dismiss()
    }
    
    private func clearFilters() {
        tempFilters = ExpenseFilters()
        minAmountText = ""
        maxAmountText = ""
        searchText = ""
        tagsText = ""
        
        expenseStore.clearFilters()
        
        Task {
            await expenseStore.fetchExpenses()
        }
        
        dismiss()
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