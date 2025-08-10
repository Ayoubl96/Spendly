import SwiftUI

struct CategoryFormView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var categoryStore: CategoryStore
    
    @State private var name: String = ""
    @State private var selectedParentId: String? = nil
    @State private var selectedColor: String = "#3B82F6"
    @State private var selectedIcon: String = "folder"
    @State private var sortOrder: Int = 0
    @State private var isActive: Bool = true
    
    @State private var showingDeleteAlert = false
    @State private var showingDeleteSuccessAlert = false
    @State private var deleteResponse: DeleteCategoryResponse?
    @State private var categoryStats: CategoryStats?
    @State private var isLoadingStats = false
    
    let editingCategory: Category?
    let isEditMode: Bool
    let onSuccess: ((String) -> Void)?
    
    private let availableColors = [
        "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
        "#06B6D4", "#F97316", "#84CC16", "#EC4899", "#6B7280"
    ]
    
    private let availableIcons = [
        "folder", "house", "car", "cart", "bag", "heart", "star",
        "gamecontroller", "book", "music.note", "camera", "phone",
        "envelope", "map", "airplane", "bus", "bicycle", "leaf"
    ]
    
    init(editingCategory: Category? = nil, onSuccess: ((String) -> Void)? = nil) {
        self.editingCategory = editingCategory
        self.isEditMode = editingCategory != nil
        self.onSuccess = onSuccess
        
        if let category = editingCategory {
            _name = State(initialValue: category.name)
            _selectedParentId = State(initialValue: category.parentId)
            _selectedColor = State(initialValue: category.color ?? "#3B82F6")
            _selectedIcon = State(initialValue: category.icon ?? "folder")
            _sortOrder = State(initialValue: category.sortOrder)
            _isActive = State(initialValue: category.isActive)
        }
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(.systemGroupedBackground)
                    .ignoresSafeArea()
                
                VStack(spacing: 0) {
                // Custom Header
                VStack(spacing: 16) {
                    // Navigation Bar
                    HStack {
                        Button(action: {
                            dismiss()
                        }) {
                            HStack(spacing: 6) {
                                Image(systemName: "xmark")
                                    .font(.system(size: 16, weight: .semibold))
                                Text("Cancel")
                                    .font(.headline)
                                    .fontWeight(.medium)
                            }
                            .foregroundColor(.primary)
                        }
                        
                        Spacer()
                        
                        Text(isEditMode ? "Edit Category" : "New Category")
                            .font(.headline)
                            .fontWeight(.bold)
                        
                        Spacer()
                        
                        Button(action: {
                            Task {
                                await saveCategory()
                            }
                        }) {
                            HStack(spacing: 6) {
                                Image(systemName: isEditMode ? "checkmark" : "plus")
                                    .font(.system(size: 16, weight: .semibold))
                                Text(isEditMode ? "Update" : "Create")
                                    .font(.headline)
                                    .fontWeight(.medium)
                            }
                            .foregroundColor(name.trimmingCharacters(in: .whitespaces).isEmpty ? .secondary : .blue)
                        }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 10)
                    
                    // Live Preview Card
                    HStack(spacing: 16) {
                        // Category Icon
                        Image(systemName: selectedIcon)
                            .font(.system(size: 28, weight: .medium))
                            .foregroundColor(.white)
                            .frame(width: 70, height: 70)
                            .background(
                                RoundedRectangle(cornerRadius: 18)
                                    .fill(
                                        LinearGradient(
                                            colors: [
                                                Color(hex: selectedColor) ?? .blue,
                                                (Color(hex: selectedColor) ?? .blue).opacity(0.8)
                                            ],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .shadow(color: (Color(hex: selectedColor) ?? .blue).opacity(0.4), radius: 12, x: 0, y: 6)
                            )
                        
                        VStack(alignment: .leading, spacing: 6) {
                            Text(name.isEmpty ? "Category Name" : name)
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.primary)
                            
                            if let parentId = selectedParentId {
                                HStack(spacing: 4) {
                                    Image(systemName: "arrow.up.left")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    Text("under \(categoryStore.getCategoryName(for: parentId))")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                            } else {
                                Text("Root Category")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Spacer()
                    }
                    .padding(20)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color(.systemBackground))
                            .shadow(color: .black.opacity(0.08), radius: 12, x: 0, y: 4)
                    )
                    .padding(.horizontal, 20)
                }
                .background(Color(.systemGroupedBackground))
                
                // Scrollable Content
                ScrollView {
                    VStack(spacing: 24) {
                    
                    // Category Details Section
                    VStack(spacing: 20) {
                        SectionHeader(title: "Category Details", icon: "info.circle")
                        
                        VStack(spacing: 16) {
                            // Name Input
                            ModernInputField(
                                title: "Name",
                                text: $name,
                                placeholder: "Enter category name",
                                icon: "textformat"
                            )
                            
                            // Parent Category Picker
                            ModernPickerField(
                                title: "Parent Category",
                                selection: $selectedParentId,
                                icon: "folder.badge.plus"
                            ) {
                                Text("None (Root Category)")
                                    .tag(String?.none)
                                ForEach(categoryStore.primaryCategories, id: \.id) { category in
                                    if category.id != editingCategory?.id {
                                        HStack {
                                            Image(systemName: category.systemIcon)
                                                .foregroundColor(category.displayColor)
                                            Text(category.name)
                                        }
                                        .tag(String?.some(category.id))
                                    }
                                }
                            }
                            
                            // Sort Order
                            ModernNumberField(
                                title: "Sort Order",
                                value: $sortOrder,
                                icon: "arrow.up.arrow.down"
                            )
                            
                            if isEditMode {
                                ModernToggleField(
                                    title: "Active",
                                    isOn: $isActive,
                                    icon: "checkmark.circle"
                                )
                            }
                        }
                    }
                    
                    // Appearance Section
                    VStack(spacing: 20) {
                        SectionHeader(title: "Appearance", icon: "paintbrush")
                        
                        VStack(spacing: 20) {
                            // Color Selection
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Image(systemName: "circle.fill")
                                        .foregroundColor(.secondary)
                                    Text("Color")
                                        .font(.headline)
                                        .fontWeight(.semibold)
                                }
                                
                                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 5), spacing: 12) {
                                    ForEach(availableColors, id: \.self) { color in
                                        Button(action: {
                                            selectedColor = color
                                            withAnimation(.spring(response: 0.3)) {
                                                // Animate color change
                                            }
                                        }) {
                                            Circle()
                                                .fill(Color(hex: color) ?? .blue)
                                                .frame(width: 50, height: 50)
                                                .overlay(
                                                    Circle()
                                                        .stroke(
                                                            selectedColor == color ? Color.primary : Color.clear,
                                                            lineWidth: 3
                                                        )
                                                )
                                                .overlay(
                                                    selectedColor == color ?
                                                    Image(systemName: "checkmark")
                                                        .font(.system(size: 16, weight: .bold))
                                                        .foregroundColor(.white)
                                                    : nil
                                                )
                                                .scaleEffect(selectedColor == color ? 1.1 : 1.0)
                                                .shadow(
                                                    color: selectedColor == color ? (Color(hex: color) ?? .blue).opacity(0.4) : .clear,
                                                    radius: 8,
                                                    x: 0,
                                                    y: 4
                                                )
                                        }
                                        .buttonStyle(PlainButtonStyle())
                                        .animation(.spring(response: 0.3), value: selectedColor)
                                    }
                                }
                            }
                            
                            // Icon Selection
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Image(systemName: "square.grid.3x3")
                                        .foregroundColor(.secondary)
                                    Text("Icon")
                                        .font(.headline)
                                        .fontWeight(.semibold)
                                }
                                
                                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 6), spacing: 12) {
                                    ForEach(availableIcons, id: \.self) { icon in
                                        Button(action: {
                                            selectedIcon = icon
                                        }) {
                                            Image(systemName: icon)
                                                .font(.system(size: 20, weight: .medium))
                                                .foregroundColor(selectedIcon == icon ? .white : .primary)
                                                .frame(width: 44, height: 44)
                                                .background(
                                                    RoundedRectangle(cornerRadius: 12)
                                                        .fill(
                                                            selectedIcon == icon ?
                                                            LinearGradient(
                                                                colors: [
                                                                    Color(hex: selectedColor) ?? .blue,
                                                                    (Color(hex: selectedColor) ?? .blue).opacity(0.8)
                                                                ],
                                                                startPoint: .topLeading,
                                                                endPoint: .bottomTrailing
                                                            ) :
                                                            LinearGradient(
                                                                colors: [Color.gray.opacity(0.1)],
                                                                startPoint: .top,
                                                                endPoint: .bottom
                                                            )
                                                        )
                                                        .shadow(
                                                            color: selectedIcon == icon ? (Color(hex: selectedColor) ?? .blue).opacity(0.3) : .clear,
                                                            radius: 6,
                                                            x: 0,
                                                            y: 3
                                                        )
                                                )
                                                .scaleEffect(selectedIcon == icon ? 1.05 : 1.0)
                                        }
                                        .buttonStyle(PlainButtonStyle())
                                        .animation(.spring(response: 0.3), value: selectedIcon)
                                    }
                                }
                            }
                        }
                        .padding(20)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color(.systemBackground))
                                .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 2)
                        )
                    }
                    
                    // Statistics Section (Edit Mode Only)
                    if isEditMode {
                        VStack(spacing: 20) {
                            SectionHeader(title: "Statistics", icon: "chart.bar")
                            
                            if isLoadingStats {
                                HStack {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                    Text("Loading statistics...")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(20)
                                .background(
                                    RoundedRectangle(cornerRadius: 16)
                                        .fill(Color(.systemBackground))
                                        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 2)
                                )
                            } else if let stats = categoryStats {
                                VStack(spacing: 16) {
                                    StatRow(title: "Expenses", value: "\(stats.expenseCount)", icon: "doc.text")
                                    StatRow(title: "Total Amount", value: String(format: "%.2f", stats.totalAmount), icon: "dollarsign.circle")
                                    StatRow(title: "Subcategories", value: "\(stats.subcategoryCount)", icon: "folder.badge.plus")
                                }
                                .padding(20)
                                .background(
                                    RoundedRectangle(cornerRadius: 16)
                                        .fill(Color(.systemBackground))
                                        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 2)
                                )
                            }
                            
                            // Delete Button - Always enabled, let backend handle validation
                            Button(action: {
                                showingDeleteAlert = true
                            }) {
                                HStack {
                                    Image(systemName: "trash")
                                        .font(.system(size: 16, weight: .semibold))
                                    Text("Delete Category")
                                        .font(.headline)
                                        .fontWeight(.semibold)
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 52)
                                .background(
                                    RoundedRectangle(cornerRadius: 16)
                                        .fill(
                                            LinearGradient(
                                                colors: [Color.red, Color.red.opacity(0.8)],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .shadow(color: Color.red.opacity(0.3), radius: 8, x: 0, y: 4)
                                )
                            }
                        }
                    }
                        
                        Spacer(minLength: 20)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                }
                }
            }
            .navigationTitle(isEditMode ? "Edit Category" : "New Category")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarHidden(true)
            .task {
                await categoryStore.fetchCategories()
                if let editingCategory = editingCategory {
                    await loadCategoryStats(for: editingCategory.id)
                }
            }
            .alert("Delete Category", isPresented: $showingDeleteAlert) {
                if categoryStats?.expenseCount ?? 0 > 0 {
                    // Show reassignment options
                    Button("Cancel", role: .cancel) { }
                    
                    // For simplicity, we'll just show a basic delete with reassignment to first available category
                    if let firstCategory = categoryStore.primaryCategories.first(where: { $0.id != editingCategory?.id }) {
                        Button("Delete & Reassign to \(firstCategory.name)", role: .destructive) {
                            Task {
                                await deleteCategory(reassignTo: firstCategory.id)
                            }
                        }
                    }
                } else {
                    Button("Cancel", role: .cancel) { }
                    Button("Delete", role: .destructive) {
                        Task {
                            await deleteCategory()
                        }
                    }
                }
            } message: {
                if let stats = categoryStats, stats.expenseCount > 0 {
                    Text("This category has \(stats.expenseCount) expenses. They will be reassigned to another category.")
                } else {
                    Text("Are you sure you want to delete this category? This action cannot be undone.")
                }
            }
            .alert("Category Deleted", isPresented: $showingDeleteSuccessAlert) {
                Button("OK") {
                    dismiss()
                }
            } message: {
                if let response = deleteResponse {
                    if response.reassignedExpenses > 0 {
                        Text("\(response.reassignedExpenses) expenses were reassigned to \(response.reassignedTo ?? "another category").")
                    } else {
                        Text("Category deleted successfully.")
                    }
                }
            }
        }
    }
    
    private func loadCategoryStats(for categoryId: String) async {
        isLoadingStats = true
        categoryStats = await categoryStore.getCategoryStats(id: categoryId)
        isLoadingStats = false
    }
    
    private func saveCategory() async {
        let trimmedName = name.trimmingCharacters(in: .whitespaces)
        
        if isEditMode, let category = editingCategory {
            let updateRequest = UpdateCategoryRequest(
                name: trimmedName != category.name ? trimmedName : nil,
                parentId: selectedParentId != category.parentId ? selectedParentId : nil,
                color: selectedColor != category.color ? selectedColor : nil,
                icon: selectedIcon != category.icon ? selectedIcon : nil,
                sortOrder: sortOrder != category.sortOrder ? sortOrder : nil,
                isActive: isActive != category.isActive ? isActive : nil
            )
            
            await categoryStore.updateCategory(id: category.id, request: updateRequest)
            
            if categoryStore.error == nil {
                onSuccess?("Category updated successfully!")
                dismiss()
            }
        } else {
            let createRequest = CreateCategoryRequest(
                name: trimmedName,
                parentId: selectedParentId,
                color: selectedColor,
                icon: selectedIcon,
                sortOrder: sortOrder,
                isActive: isActive
            )
            
            await categoryStore.createCategory(createRequest)
            
            if categoryStore.error == nil {
                onSuccess?("Category created successfully!")
                dismiss()
            }
        }
    }
    
    private func deleteCategory(reassignTo: String? = nil) async {
        guard let category = editingCategory else { return }
        
        let response = await categoryStore.deleteCategory(id: category.id, reassignTo: reassignTo)
        if let response = response {
            deleteResponse = response
            showingDeleteSuccessAlert = true
        }
    }
}

// MARK: - Custom UI Components

struct SectionHeader: View {
    let title: String
    let icon: String
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.blue)
            Text(title)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.primary)
            Spacer()
        }
    }
}

struct ModernInputField: View {
    let title: String
    @Binding var text: String
    let placeholder: String
    let icon: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(.secondary)
                Text(title)
                    .font(.headline)
                    .fontWeight(.semibold)
            }
            
            TextField(placeholder, text: $text)
                .textFieldStyle(PlainTextFieldStyle())
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(.systemGray6))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.blue.opacity(0.3), lineWidth: text.isEmpty ? 0 : 2)
                        )
                )
                .animation(.easeInOut(duration: 0.2), value: text)
        }
    }
}

struct ModernPickerField<Content: View>: View {
    let title: String
    @Binding var selection: String?
    let icon: String
    @ViewBuilder let content: Content
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(.secondary)
                Text(title)
                    .font(.headline)
                    .fontWeight(.semibold)
            }
            
            Picker(title, selection: $selection) {
                content
            }
            .pickerStyle(MenuPickerStyle())
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(.systemGray6))
            )
        }
    }
}

struct ModernNumberField: View {
    let title: String
    @Binding var value: Int
    let icon: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(.secondary)
                Text(title)
                    .font(.headline)
                    .fontWeight(.semibold)
            }
            
            TextField("0", value: $value, format: .number)
                .textFieldStyle(PlainTextFieldStyle())
                .keyboardType(.numberPad)
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(.systemGray6))
                )
        }
    }
}

struct ModernToggleField: View {
    let title: String
    @Binding var isOn: Bool
    let icon: String
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(.secondary)
            Text(title)
                .font(.headline)
                .fontWeight(.semibold)
            Spacer()
            Toggle("", isOn: $isOn)
                .labelsHidden()
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray6))
        )
    }
}

struct StatRow: View {
    let title: String
    let value: String
    let icon: String
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(.blue)
                .frame(width: 24)
            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(.primary)
        }
    }
}

#Preview {
    CategoryFormView()
}

#Preview("Edit Mode") {
    // Create a sample category for preview
    let sampleData = """
    {
        "id": "1",
        "name": "Test Category",
        "parent_id": null,
        "user_id": "user1",
        "color": "#EF4444",
        "icon": "car",
        "sort_order": 1,
        "is_active": true,
        "created_at": "2025-08-10T22:23:41.473299",
        "updated_at": "2025-08-10T22:23:41.473299"
    }
    """.data(using: .utf8)!
    
    let decoder = JSONDecoder()
    let sampleCategory = try! decoder.decode(Category.self, from: sampleData)
    
    return CategoryFormView(editingCategory: sampleCategory)
}
