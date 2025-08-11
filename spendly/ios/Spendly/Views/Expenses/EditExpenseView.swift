import SwiftUI

struct EditExpenseView: View {
    let expense: Expense
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var expenseStore: ExpenseStore
    @EnvironmentObject var authStore: AuthStore
    @EnvironmentObject var categoryStore: CategoryStore
    
    @State private var amount: String
    @State private var description: String
    @State private var selectedCategory: String
    @State private var selectedSubcategory: String
    @State private var selectedPaymentMethod: LegacyPaymentMethod
    @State private var expenseDate: Date
    @State private var notes: String
    @State private var vendor: String
    @State private var location: String
    @State private var tags: String
    @State private var isLoading = false
    @State private var showingAlert = false
    @State private var alertMessage = ""
    
    init(expense: Expense) {
        self.expense = expense
        _amount = State(initialValue: String(expense.amount))
        _description = State(initialValue: expense.description)
        _selectedCategory = State(initialValue: expense.categoryId ?? "")
        _selectedSubcategory = State(initialValue: expense.subcategoryId ?? "")
        _selectedPaymentMethod = State(initialValue: expense.paymentMethod ?? .card)
        _expenseDate = State(initialValue: expense.expenseDate)
        _notes = State(initialValue: expense.notes ?? "")
        _vendor = State(initialValue: expense.vendor ?? "")
        _location = State(initialValue: expense.location ?? "")
        _tags = State(initialValue: expense.tags?.joined(separator: ", ") ?? "")
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("Basic Information") {
                    HStack {
                        Text("Amount")
                        Spacer()
                        TextField("0.00", text: $amount)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                    }
                    
                    HStack {
                        Text("Description")
                        Spacer()
                        TextField("Enter description", text: $description)
                            .multilineTextAlignment(.trailing)
                    }
                    
                    DatePicker("Date", selection: $expenseDate, displayedComponents: .date)
                }
                
                Section("Category") {
                    Picker("Category", selection: $selectedCategory) {
                        Text("None").tag("")
                        ForEach(categoryStore.categories) { category in
                            Text(category.name).tag(category.id)
                        }
                    }
                    
                    if !selectedCategory.isEmpty {
                        Picker("Subcategory", selection: $selectedSubcategory) {
                            Text("None").tag("")
                            ForEach(getSubcategories(for: selectedCategory)) { subcategory in
                                Text(subcategory.name).tag(subcategory.id)
                            }
                        }
                    }
                }
                
                Section("Payment") {
                    Picker("Payment Method", selection: $selectedPaymentMethod) {
                        ForEach(LegacyPaymentMethod.allCases, id: \.self) { method in
                            Text(method.displayName).tag(method)
                        }
                    }
                }
                
                Section("Additional Details") {
                    HStack {
                        Text("Vendor")
                        Spacer()
                        TextField("Enter vendor", text: $vendor)
                            .multilineTextAlignment(.trailing)
                    }
                    
                    HStack {
                        Text("Location")
                        Spacer()
                        TextField("Enter location", text: $location)
                            .multilineTextAlignment(.trailing)
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Notes")
                        TextField("Enter notes", text: $notes, axis: .vertical)
                            .lineLimit(3...6)
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Tags")
                        TextField("tag1, tag2, tag3", text: $tags)
                    }
                }
            }
            .navigationTitle("Edit Expense")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveExpense()
                    }
                    .disabled(!isFormValid || isLoading)
                }
            }
            .alert("Error", isPresented: $showingAlert) {
                Button("OK") { }
            } message: {
                Text(alertMessage)
            }
            .disabled(isLoading)
            .overlay(
                Group {
                    if isLoading {
                        Color.black.opacity(0.3)
                            .ignoresSafeArea()
                        
                        ProgressView("Saving...")
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(12)
                    }
                }
            )
        }
    }
    
    private var isFormValid: Bool {
        !amount.isEmpty && !description.isEmpty && Double(amount) != nil
    }
    
    private func getSubcategories(for categoryId: String) -> [Category] {
        return categoryStore.categories.filter { $0.parentId == categoryId }
    }
    
    private func saveExpense() {
        guard let amountValue = Double(amount) else {
            alertMessage = "Please enter a valid amount"
            showingAlert = true
            return
        }
        
        isLoading = true
        
        // Parse tags
        let tagArray = tags.isEmpty ? nil : tags.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        
        let request = CreateExpenseRequest(
            amount: amountValue,
            currency: expense.currency,
            description: description,
            expenseDate: expenseDate,
            categoryId: selectedCategory.isEmpty ? nil : selectedCategory,
            subcategoryId: selectedSubcategory.isEmpty ? nil : selectedSubcategory,
            paymentMethod: selectedPaymentMethod,
            paymentMethodId: nil,
            notes: notes.isEmpty ? nil : notes,
            location: location.isEmpty ? nil : location,
            vendor: vendor.isEmpty ? nil : vendor,
            isShared: expense.isShared,
            sharedWith: expense.sharedWith,
            tags: tagArray,
            amountInBaseCurrency: nil,
            exchangeRate: nil
        )
        
        Task {
            do {
                await expenseStore.updateExpense(id: expense.id, request: request)
                
                await MainActor.run {
                    isLoading = false
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    alertMessage = "Failed to update expense: \(error.localizedDescription)"
                    showingAlert = true
                }
            }
        }
    }
}

#Preview {
    let expense = Expense(
        id: "1",
        amount: 25.50,
        currency: "EUR",
        amountInBaseCurrency: nil,
        exchangeRate: nil,
        description: "Coffee and pastry",
        expenseDate: Date(),
        userId: "user1",
        categoryId: "food",
        subcategoryId: nil,
        paymentMethod: .card,
        paymentMethodId: nil,
        receiptUrl: nil,
        notes: "Morning coffee with a colleague",
        location: "Café Central",
        vendor: "Starbucks",
        isShared: false,
        sharedWith: nil,
        tags: ["business", "meeting"],
        createdAt: Date(),
        updatedAt: Date()
    )
    
    EditExpenseView(expense: expense)
        .environmentObject(ExpenseStore())
        .environmentObject(AuthStore())
        .environmentObject(CategoryStore())
}
