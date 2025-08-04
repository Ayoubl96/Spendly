import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { CategorySelect } from '../ui/category-select'
import { X } from 'lucide-react'
import { CategoryTree, CreateCategoryRequest, UpdateCategoryRequest } from '../../types/api.types'
import { IconRenderer } from '../../utils/iconRenderer'

interface CategoryFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateCategoryRequest | UpdateCategoryRequest) => void
  editingCategory?: CategoryTree | null
  categories: CategoryTree[]
  isLoading?: boolean
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#6b7280'
]

const PRESET_ICONS = [
  'car', 'home', 'utensils', 'shopping-cart', 'gamepad-2', 'plane',
  'briefcase', 'heart', 'book', 'music', 'coffee', 'gift',
  'fuel', 'stethoscope', 'graduation-cap', 'shirt', 'scissors', 'dumbbell'
]

export function CategoryForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingCategory, 
  categories, 
  isLoading = false 
}: CategoryFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    parentId: '',
    color: '#6b7280',
    icon: '',
    sortOrder: 0
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editingCategory) {
      setFormData({
        name: editingCategory.name,
        parentId: editingCategory.parentId || '',
        color: editingCategory.color || '#6b7280',
        icon: editingCategory.icon || '',
        sortOrder: editingCategory.sortOrder
      })
    } else {
      setFormData({
        name: '',
        parentId: '',
        color: '#6b7280',
        icon: '',
        sortOrder: 0
      })
    }
    setErrors({})
  }, [editingCategory, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Category name must be at least 2 characters'
    }

    // Check for duplicate names
    const existingCategory = categories.find(cat => {
      if (editingCategory && cat.id === editingCategory.id) {
        return false // Skip the category being edited
      }
      
      // For primary categories
      if (!formData.parentId) {
        return cat.name.toLowerCase() === formData.name.trim().toLowerCase() && !cat.parentId
      }
      
      // For subcategories
      const parentCategory = categories.find(parent => parent.id === formData.parentId)
      if (parentCategory) {
        return parentCategory.subcategories.some(sub => 
          sub.name.toLowerCase() === formData.name.trim().toLowerCase()
        )
      }
      
      return false
    })

    if (existingCategory) {
      newErrors.name = 'A category with this name already exists'
    }

    if (!formData.color.match(/^#[0-9A-F]{6}$/i)) {
      newErrors.color = 'Please select a valid color'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const submitData = {
      name: formData.name.trim(),
      parentId: formData.parentId || undefined,
      color: formData.color,
      icon: formData.icon || undefined,
      sortOrder: formData.sortOrder
    }

    onSubmit(submitData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // Get primary categories for parent selection (excluding the one being edited)
  const primaryCategories = categories.filter(cat => 
    !cat.parentId && (!editingCategory || cat.id !== editingCategory.id)
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name *
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter category name"
                disabled={isLoading}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name}</p>
              )}
            </div>

            {/* Parent Category */}
            <CategorySelect
              categories={[
                { id: 'NONE', name: 'None (Primary Category)', icon: '' },
                ...primaryCategories
              ]}
              value={formData.parentId === '' ? 'NONE' : formData.parentId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, parentId: value === 'NONE' ? '' : (value || '') }))}
              label="Parent Category"
              placeholder="Select parent category"
              disabled={isLoading}
              height="h-10"
            />

            {/* Color */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? 'border-primary' : 'border-muted'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    disabled={isLoading}
                  />
                ))}
              </div>
              <Input
                type="color"
                name="color"
                value={formData.color}
                onChange={handleChange}
                disabled={isLoading}
                className="w-20 h-8"
              />
              {errors.color && (
                <p className="text-sm text-destructive mt-1">{errors.color}</p>
              )}
            </div>

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Icon
              </label>
              
              {/* Selected icon preview */}
              <div className="mb-3 p-3 border rounded-md bg-muted/50">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg border-2 flex items-center justify-center shadow-sm" 
                    style={{ backgroundColor: formData.color, borderColor: formData.color }}
                  >
                    {formData.icon ? (
                      <IconRenderer 
                        icon={formData.icon} 
                        size={16} 
                        className="text-white drop-shadow-sm"
                      />
                    ) : (
                      <span className="text-xs text-white">?</span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formData.icon ? 
                      formData.icon.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                      'No icon selected'
                    }
                  </span>
                </div>
              </div>
              
              {/* Icon grid */}
              <div className="grid grid-cols-6 gap-2 mb-2">
                {/* No icon option */}
                <button
                  type="button"
                  className={`w-10 h-10 rounded-md border-2 flex items-center justify-center text-xs ${
                    !formData.icon ? 'border-primary bg-primary/10' : 'border-muted hover:border-muted-foreground'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, icon: '' }))}
                  disabled={isLoading}
                >
                  None
                </button>
                
                {/* Icon options */}
                {PRESET_ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    className={`w-10 h-10 rounded-md border-2 flex items-center justify-center ${
                      formData.icon === icon ? 'border-primary bg-primary/10' : 'border-muted hover:border-muted-foreground'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, icon }))}
                    disabled={isLoading}
                    title={icon.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  >
                    <IconRenderer icon={icon} size={16} />
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Order */}
            <div>
              <label htmlFor="sortOrder" className="block text-sm font-medium mb-1">
                Sort Order
              </label>
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={handleChange}
                placeholder="0"
                disabled={isLoading}
                min="0"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="button"
                variant="outline" 
                className="flex-1"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}