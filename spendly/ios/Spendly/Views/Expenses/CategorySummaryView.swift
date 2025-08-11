import SwiftUI

struct CategorySummaryView: View {
    let expenses: [Expense]
    @EnvironmentObject var categoryStore: CategoryStore
    @State private var expandedCategories = Set<String>()
    
    private var categoryBreakdown: [CategoryBreakdown] {
        let grouped = Dictionary(grouping: expenses) { expense in
            expense.categoryId ?? "uncategorized"
        }
        
        return grouped.map { categoryId, expenses in
            let total = expenses.reduce(0) { $0 + ($1.amountInBaseCurrency ?? $1.amount) }
            return CategoryBreakdown(
                categoryId: categoryId,
                categoryName: categoryStore.getCategoryName(for: categoryId),
                amount: total,
                count: expenses.count,
                expenses: expenses
            )
        }
        .sorted { $0.amount > $1.amount }
    }
    
    private var totalAmount: Double {
        expenses.reduce(0) { $0 + ($1.amountInBaseCurrency ?? $1.amount) }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Expenses by Category")
                .font(.headline)
                .padding(.horizontal)
            
            if categoryBreakdown.isEmpty {
                emptyStateView
            } else {
                LazyVStack(spacing: 8) {
                    ForEach(categoryBreakdown, id: \.categoryId) { breakdown in
                        CategoryBreakdownCard(
                            breakdown: breakdown,
                            totalAmount: totalAmount,
                            isExpanded: expandedCategories.contains(breakdown.categoryId),
                            onToggleExpanded: {
                                if expandedCategories.contains(breakdown.categoryId) {
                                    expandedCategories.remove(breakdown.categoryId)
                                } else {
                                    expandedCategories.insert(breakdown.categoryId)
                                }
                            }
                        )
                    }
                }
                .padding(.horizontal)
            }
        }
    }
    
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "chart.pie")
                .font(.system(size: 40))
                .foregroundColor(.secondary)
            
            Text("No category data available")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.secondarySystemBackground))
        )
        .padding(.horizontal)
    }
}

struct CategoryBreakdown {
    let categoryId: String
    let categoryName: String
    let amount: Double
    let count: Int
    let expenses: [Expense]
}

struct CategoryBreakdownCard: View {
    let breakdown: CategoryBreakdown
    let totalAmount: Double
    let isExpanded: Bool
    let onToggleExpanded: () -> Void
    @EnvironmentObject var categoryStore: CategoryStore
    
    private var percentage: Double {
        guard totalAmount > 0 else { return 0 }
        return (breakdown.amount / totalAmount) * 100
    }
    
    var body: some View {
        VStack(spacing: 0) {
            Button(action: onToggleExpanded) {
                HStack(spacing: 12) {
                    // Category Icon
                    Image(systemName: categoryStore.getCategoryIcon(for: breakdown.categoryId))
                        .foregroundColor(.white)
                        .frame(width: 40, height: 40)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill(categoryStore.getCategoryColor(for: breakdown.categoryId))
                        )
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(breakdown.categoryName)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.primary)
                        
                        HStack(spacing: 8) {
                            Text("\(breakdown.count) expense\(breakdown.count == 1 ? "" : "s")")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            Text("•")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            Text(String(format: "%.1f%%", percentage))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(breakdown.amount.formatted(currency: "EUR"))
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                        
                        // Progress bar
                        ProgressView(value: percentage / 100)
                            .progressViewStyle(LinearProgressViewStyle(tint: categoryStore.getCategoryColor(for: breakdown.categoryId)))
                            .frame(width: 80)
                    }
                    
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding()
            }
            .buttonStyle(PlainButtonStyle())
            
            if isExpanded {
                Divider()
                    .padding(.horizontal)
                
                LazyVStack(spacing: 8) {
                    ForEach(breakdown.expenses.prefix(10)) { expense in
                        ExpenseRowView(expense: expense)
                            .padding(.horizontal)
                    }
                    
                    if breakdown.expenses.count > 10 {
                        Text("... and \(breakdown.expenses.count - 10) more")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.horizontal)
                            .padding(.bottom, 8)
                    }
                }
                .padding(.bottom, 8)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemBackground))
                .shadow(color: Color.black.opacity(0.05), radius: 3, x: 0, y: 1)
        )
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
    let sampleExpenses = [
        Expense(
            id: "1",
            amount: 25.50,
            currency: "EUR",
            amountInBaseCurrency: nil,
            exchangeRate: nil,
            description: "Coffee",
            expenseDate: Date(),
            userId: "user1",
            categoryId: "food",
            subcategoryId: nil,
            paymentMethod: .card,
            paymentMethodId: nil,
            receiptUrl: nil,
            notes: nil,
            location: nil,
            vendor: "Starbucks",
            isShared: false,
            sharedWith: nil,
            tags: nil,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Expense(
            id: "2",
            amount: 15.00,
            currency: "EUR",
            amountInBaseCurrency: nil,
            exchangeRate: nil,
            description: "Bus ticket",
            expenseDate: Date(),
            userId: "user1",
            categoryId: "transport",
            subcategoryId: nil,
            paymentMethod: .cash,
            paymentMethodId: nil,
            receiptUrl: nil,
            notes: nil,
            location: nil,
            vendor: nil,
            isShared: false,
            sharedWith: nil,
            tags: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
    ]
    
    CategorySummaryView(expenses: sampleExpenses)
        .environmentObject(CategoryStore())
}
