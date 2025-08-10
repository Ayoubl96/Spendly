import Foundation
import SwiftUI

@MainActor
class CategoryStore: ObservableObject {
    @Published var categories: [Category] = []
    @Published var categoryTree: [CategoryTree] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiService = APIService.shared
    
    var primaryCategories: [Category] {
        categories.filter { $0.parentId == nil }
    }
    
    func subcategories(for parentId: String) -> [Category] {
        categories.filter { $0.parentId == parentId }
    }
    
    func fetchCategories() async {
        isLoading = true
        error = nil
        
        do {
            categories = try await apiService.getCategories()
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func fetchCategoryTree() async {
        isLoading = true
        error = nil
        
        do {
            categoryTree = try await apiService.getCategoryTree()
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func createCategory(_ request: CreateCategoryRequest) async {
        isLoading = true
        error = nil
        
        do {
            let newCategory = try await apiService.createCategory(request)
            categories.append(newCategory)
            await fetchCategoryTree()
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func updateCategory(id: String, request: UpdateCategoryRequest) async {
        isLoading = true
        error = nil
        
        do {
            let updatedCategory = try await apiService.updateCategory(id: id, category: request)
            if let index = categories.firstIndex(where: { $0.id == id }) {
                categories[index] = updatedCategory
            }
            await fetchCategoryTree()
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func deleteCategory(id: String, reassignTo: String? = nil) async {
        isLoading = true
        error = nil
        
        do {
            try await apiService.deleteCategory(id: id, reassignTo: reassignTo)
            categories.removeAll { $0.id == id }
            await fetchCategoryTree()
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func getCategoryName(for id: String?) -> String {
        guard let id = id else { return "Uncategorized" }
        return categories.first { $0.id == id }?.name ?? "Unknown"
    }
    
    func getCategoryColor(for id: String?) -> Color {
        guard let id = id,
              let category = categories.first(where: { $0.id == id }) else {
            return .gray
        }
        return category.displayColor
    }
    
    func getCategoryIcon(for id: String?) -> String {
        guard let id = id,
              let category = categories.first(where: { $0.id == id }) else {
            return "folder"
        }
        return category.systemIcon
    }
}