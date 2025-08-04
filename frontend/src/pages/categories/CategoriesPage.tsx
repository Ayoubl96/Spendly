import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Plus, Tags, Edit, Trash2, BarChart3, AlertTriangle, ChevronDown, ChevronRight, Grid, List, Search } from 'lucide-react'
import { useExpenseStore } from '../../stores/expense.store'
import { apiService } from '../../services/api.service'
import { CategoryTree, CategoryStats, UpdateCategoryRequest, CreateCategoryRequest } from '../../types/api.types'
import { CategoryForm } from '../../components/categories/CategoryForm'
import { IconRenderer } from '../../utils/iconRenderer'

export function CategoriesPage() {
  const { categoryTree, fetchCategoryTree, isLoading } = useExpenseStore()
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryTree | null>(null)
  const [categoryStats, setCategoryStats] = useState<Record<string, CategoryStats>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<{ category: CategoryTree; reassignTo?: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchCategoryTree()
  }, [fetchCategoryTree])

  const loadCategoryStats = async (categoryId: string) => {
    try {
      const stats = await apiService.getCategoryStats(categoryId)
      setCategoryStats(prev => ({ ...prev, [categoryId]: stats }))
    } catch (error) {
      console.error('Failed to load category stats:', error)
    }
  }

  const handleCreateCategory = async (data: CreateCategoryRequest) => {
    setIsSubmitting(true)
    try {
      await apiService.createCategory(data)
      await fetchCategoryTree()
      setShowForm(false)
    } catch (error) {
      console.error('Failed to create category:', error)
      alert('Failed to create category. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateCategory = async (data: UpdateCategoryRequest) => {
    if (!editingCategory) return
    
    setIsSubmitting(true)
    try {
      await apiService.updateCategory(editingCategory.id, data)
      await fetchCategoryTree()
      setEditingCategory(null)
    } catch (error) {
      console.error('Failed to update category:', error)
      alert('Failed to update category. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFormSubmit = (data: CreateCategoryRequest | UpdateCategoryRequest) => {
    if (editingCategory) {
      handleUpdateCategory(data as UpdateCategoryRequest)
    } else {
      handleCreateCategory(data as CreateCategoryRequest)
    }
  }

  const handleDeleteCategory = async (category: CategoryTree, reassignToCategoryId?: string) => {
    setIsDeleting(true)
    try {
      const result = await apiService.deleteCategory(category.id, reassignToCategoryId)
      
      if (result.reassigned_expenses > 0) {
        alert(`Category deleted successfully. ${result.reassigned_expenses} expenses were reassigned to "${result.reassigned_to}".`)
      } else {
        alert('Category deleted successfully.')
      }
      
      await fetchCategoryTree()
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Failed to delete category:', error)
      alert('Failed to delete category. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteClick = async (category: CategoryTree) => {
    await loadCategoryStats(category.id)
    const stats = categoryStats[category.id]
    
    if (stats && (stats.expense_count > 0 || stats.subcategory_count > 0)) {
      setDeleteConfirm({ category })
    } else {
      if (window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
        await handleDeleteCategory(category)
      }
    }
  }

  const toggleCategoryCollapse = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  const filteredCategories = categoryTree.filter(category => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const matchesName = category.name.toLowerCase().includes(query)
    const matchesSubcategory = category.subcategories.some(sub => 
      sub.name.toLowerCase().includes(query)
    )
    return matchesName || matchesSubcategory
  })

  const renderCompactCard = (category: CategoryTree, isSubcategory: boolean = false) => {
    const stats = categoryStats[category.id]
    const hasSubcategories = category.subcategories.length > 0
    const isCollapsed = collapsedCategories.has(category.id)
    
    return (
      <Card 
        key={category.id} 
        className={`${isSubcategory ? 'ml-4 border-l-4 border-l-muted' : ''} hover:shadow-md transition-shadow`}
      >
        <CardHeader className={`pb-2 ${viewMode === 'grid' ? 'p-4' : 'py-3 px-4'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Collapse button for parent categories with subcategories */}
              {hasSubcategories && !isSubcategory && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted"
                  onClick={() => toggleCategoryCollapse(category.id)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              )}
              
              {/* Category icon and color */}
              <div className="flex items-center gap-2 shrink-0">
                <div 
                  className="w-6 h-6 rounded-lg border-2 flex items-center justify-center shadow-sm" 
                  style={{ backgroundColor: category.color || '#6b7280', borderColor: category.color || '#6b7280' }}
                >
                  {category.icon && (
                    <IconRenderer 
                      icon={category.icon} 
                      size={12} 
                      className="text-white drop-shadow-sm"
                    />
                  )}
                </div>
              </div>
              
              {/* Category info */}
              <div className="flex-1 min-w-0">
                <CardTitle className={`${viewMode === 'grid' ? 'text-sm' : 'text-base'} truncate`}>
                  {category.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  {hasSubcategories && `${category.subcategories.length} sub`}
                  {category.expenseCount !== undefined && category.expenseCount > 0 && (
                    <span>{hasSubcategories ? ' • ' : ''}{category.expenseCount} exp</span>
                  )}
                  {category.totalAmount !== undefined && category.totalAmount > 0 && (
                    <span> • ${category.totalAmount.toFixed(0)}</span>
                  )}
                </CardDescription>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-muted"
                onClick={() => setEditingCategory(category)}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive"
                onClick={() => handleDeleteClick(category)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  const renderCategories = () => {
    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCategories.map((category) => (
            <div key={category.id} className="space-y-2">
              <div className="group">
                {renderCompactCard(category)}
              </div>
              {/* Subcategories in grid mode - show in collapsed parent card or separate smaller cards */}
              {!collapsedCategories.has(category.id) && category.subcategories.length > 0 && (
                <div className="grid gap-2 ml-2">
                  {category.subcategories
                    .filter(sub => !searchQuery || sub.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((subcategory) => (
                      <div key={subcategory.id} className="group">
                        {renderCompactCard(subcategory, true)}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      )
    }

    // List view
    return (
      <div className="space-y-2">
        {filteredCategories.map((category) => (
          <div key={category.id} className="space-y-1">
            <div className="group">
              {renderCompactCard(category)}
            </div>
            {!collapsedCategories.has(category.id) && category.subcategories.length > 0 && (
              <div className="space-y-1">
                {category.subcategories
                  .filter(sub => !searchQuery || sub.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((subcategory) => (
                    <div key={subcategory.id} className="group">
                      {renderCompactCard(subcategory, true)}
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">Loading categories...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
            <p className="text-muted-foreground">
              Organize and manage your expense categories and subcategories
            </p>
          </div>
          <Button 
            className="gap-2" 
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-0 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="gap-2"
            >
              <Grid className="h-4 w-4" />
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              List
            </Button>
          </div>
          
          {filteredCategories.length !== categoryTree.length && (
            <div className="text-sm text-muted-foreground">
              Showing {filteredCategories.length} of {categoryTree.length} categories
            </div>
          )}
        </div>
      </div>

      {/* Categories List */}
      {categoryTree.length > 0 ? (
        <>
          {filteredCategories.length > 0 ? (
            renderCategories()
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No categories found</h3>
                  <p className="text-muted-foreground mb-6">
                    No categories match your search "{searchQuery}". Try a different search term.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Search
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Tags className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No categories found</h3>
              <p className="text-muted-foreground mb-6">
                Start organizing your expenses by creating your first category.
              </p>
              <Button 
                className="gap-2" 
                onClick={() => setShowForm(true)}
              >
                <Plus className="h-4 w-4" />
                Create Your First Category
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle>Delete Category</CardTitle>
              </div>
              <CardDescription>
                "{deleteConfirm.category.name}" has {categoryStats[deleteConfirm.category.id]?.expense_count || 0} expenses
                {categoryStats[deleteConfirm.category.id]?.subcategory_count > 0 && 
                  ` and ${categoryStats[deleteConfirm.category.id].subcategory_count} subcategories`
                }.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoryStats[deleteConfirm.category.id]?.subcategory_count > 0 ? (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">
                    Cannot delete category with subcategories. Please delete subcategories first.
                  </p>
                </div>
              ) : categoryStats[deleteConfirm.category.id]?.expense_count > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm">Select a category to reassign the expenses to:</p>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={deleteConfirm.reassignTo || ''}
                    onChange={(e) => setDeleteConfirm({ ...deleteConfirm, reassignTo: e.target.value })}
                  >
                    <option value="">Select category...</option>
                    {categoryTree
                      .filter(cat => cat.id !== deleteConfirm.category.id)
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))
                    }
                  </select>
                </div>
              ) : (
                <p className="text-sm">This action cannot be undone.</p>
              )}
              
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => handleDeleteCategory(deleteConfirm.category, deleteConfirm.reassignTo)}
                  disabled={
                    isDeleting || 
                    (categoryStats[deleteConfirm.category.id]?.subcategory_count > 0) ||
                    (categoryStats[deleteConfirm.category.id]?.expense_count > 0 && !deleteConfirm.reassignTo)
                  }
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Form */}
      <CategoryForm
        isOpen={showForm || !!editingCategory}
        onClose={() => {
          setShowForm(false)
          setEditingCategory(null)
        }}
        onSubmit={handleFormSubmit}
        editingCategory={editingCategory}
        categories={categoryTree}
        isLoading={isSubmitting}
      />
    </div>
  )
}