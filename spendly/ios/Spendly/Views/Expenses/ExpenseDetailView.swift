import SwiftUI

struct ExpenseDetailView: View {
    let expense: Expense
    @State private var isEditing = false
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var expenseStore: ExpenseStore
    @EnvironmentObject var categoryStore: CategoryStore
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Header Card with Amount
                    VStack(spacing: 16) {
                        HStack {
                            Image(systemName: categoryStore.getCategoryIcon(for: expense.categoryId))
                                .foregroundColor(.white)
                                .frame(width: 60, height: 60)
                                .background(
                                    RoundedRectangle(cornerRadius: 16)
                                        .fill(categoryStore.getCategoryColor(for: expense.categoryId))
                                        .shadow(color: categoryStore.getCategoryColor(for: expense.categoryId).opacity(0.3), radius: 4, x: 0, y: 2)
                                )
                            
                            Spacer()
                            
                            VStack(alignment: .trailing, spacing: 4) {
                                Text(expense.amount.formatted(currency: expense.currency))
                                    .font(.title2)
                                    .fontWeight(.bold)
                                
                                if let amountInBase = expense.amountInBaseCurrency,
                                   let rate = expense.exchangeRate,
                                   rate != 1.0 {
                                    Text("≈ \(amountInBase.formatted(currency: "EUR"))")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text(expense.description)
                                .font(.headline)
                                .lineLimit(nil)
                            
                            Text(expense.expenseDate.formatted(date: .complete, time: .omitted))
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color(.systemBackground))
                            .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
                    )
                    
                    // Details Section
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Details")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        VStack(spacing: 0) {
                            DetailRow(
                                title: "Category",
                                value: categoryStore.getCategoryName(for: expense.categoryId),
                                systemImage: "folder"
                            )
                            
                            if let subcategoryId = expense.subcategoryId {
                                DetailRow(
                                    title: "Subcategory",
                                    value: categoryStore.getCategoryName(for: subcategoryId),
                                    systemImage: "folder.badge.plus"
                                )
                            }
                            
                            if let paymentMethod = expense.paymentMethod {
                                DetailRow(
                                    title: "Payment Method",
                                    value: paymentMethod.displayName,
                                    systemImage: "creditcard"
                                )
                            }
                            
                            if let vendor = expense.vendor, !vendor.isEmpty {
                                DetailRow(
                                    title: "Vendor",
                                    value: vendor,
                                    systemImage: "building.2"
                                )
                            }
                            
                            if let location = expense.location, !location.isEmpty {
                                DetailRow(
                                    title: "Location",
                                    value: location,
                                    systemImage: "location"
                                )
                            }
                            
                            if let notes = expense.notes, !notes.isEmpty {
                                DetailRow(
                                    title: "Notes",
                                    value: notes,
                                    systemImage: "note.text",
                                    isMultiline: true
                                )
                            }
                            
                            if let tags = expense.tags, !tags.isEmpty {
                                HStack {
                                    Image(systemName: "tag")
                                        .foregroundColor(.blue)
                                        .frame(width: 24)
                                    
                                    Text("Tags")
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                    
                                    Spacer()
                                    
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 8) {
                                            ForEach(tags, id: \.self) { tag in
                                                Text(tag)
                                                    .font(.caption)
                                                    .padding(.horizontal, 8)
                                                    .padding(.vertical, 4)
                                                    .background(Color.blue.opacity(0.1))
                                                    .foregroundColor(.blue)
                                                    .cornerRadius(8)
                                            }
                                        }
                                        .padding(.horizontal, 4)
                                    }
                                }
                                .padding()
                                .background(Color(.systemBackground))
                            }
                        }
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color(.systemBackground))
                                .shadow(color: Color.black.opacity(0.05), radius: 3, x: 0, y: 1)
                        )
                    }
                    
                    // Metadata Section
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Metadata")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        VStack(spacing: 0) {
                            DetailRow(
                                title: "Created",
                                value: expense.createdAt.formatted(date: .abbreviated, time: .shortened),
                                systemImage: "calendar.badge.plus"
                            )
                            
                            DetailRow(
                                title: "Updated",
                                value: expense.updatedAt.formatted(date: .abbreviated, time: .shortened),
                                systemImage: "calendar.badge.exclamationmark"
                            )
                        }
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color(.systemBackground))
                                .shadow(color: Color.black.opacity(0.05), radius: 3, x: 0, y: 1)
                        )
                    }
                }
                .padding()
            }
            .navigationTitle("Expense Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Edit") {
                        isEditing = true
                    }
                }
            }
            .sheet(isPresented: $isEditing) {
                EditExpenseView(expense: expense)
            }
        }
    }
}

struct DetailRow: View {
    let title: String
    let value: String
    let systemImage: String
    let isMultiline: Bool
    
    init(title: String, value: String, systemImage: String, isMultiline: Bool = false) {
        self.title = title
        self.value = value
        self.systemImage = systemImage
        self.isMultiline = isMultiline
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: systemImage)
                    .foregroundColor(.blue)
                    .frame(width: 24)
                
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                if !isMultiline {
                    Spacer()
                    
                    Text(value)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.trailing)
                }
            }
            
            if isMultiline {
                Text(value)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding(.leading, 32)
            }
        }
        .padding()
        .background(Color(.systemBackground))
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
    
    ExpenseDetailView(expense: expense)
        .environmentObject(ExpenseStore())
        .environmentObject(CategoryStore())
}
