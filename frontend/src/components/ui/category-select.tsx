import React from 'react'
import { X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Button } from './button'
import { IconRenderer } from '../../utils/iconRenderer'

interface Category {
  id: string
  name: string
  icon?: string
}

interface CategorySelectProps {
  categories: Category[]
  value?: string
  onValueChange: (value: string | undefined) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  showClearButton?: boolean
  className?: string
  height?: string
  required?: boolean
}

export function CategorySelect({
  categories,
  value,
  onValueChange,
  placeholder = "Select category",
  label,
  disabled = false,
  showClearButton = false,
  className = "",
  height = "h-9",
  required = false
}: CategorySelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="flex gap-2">
        <Select
          value={value || undefined}
          onValueChange={onValueChange}
          disabled={disabled}
        >
          <SelectTrigger className={`${height} flex-1`}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <span className="flex items-center gap-2">
                  {category.icon && <IconRenderer icon={category.icon} size={16} />}
                  <span>{category.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showClearButton && value && (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => onValueChange(undefined)}
            className={`${height} px-3 shrink-0 hover:bg-red-50 hover:text-red-600 border border-gray-300`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

interface CategorySubcategorySelectProps {
  categoryTree: Array<Category & { subcategories: Category[] }>
  selectedCategoryId?: string
  selectedSubcategoryId?: string
  onCategoryChange: (categoryId: string | undefined) => void
  onSubcategoryChange: (subcategoryId: string | undefined) => void
  categoryLabel?: string
  subcategoryLabel?: string
  categoryPlaceholder?: string
  subcategoryPlaceholder?: string
  showClearButtons?: boolean
  className?: string
  height?: string
  required?: boolean
}

export function CategorySubcategorySelect({
  categoryTree,
  selectedCategoryId,
  selectedSubcategoryId,
  onCategoryChange,
  onSubcategoryChange,
  categoryLabel = "Primary Category",
  subcategoryLabel = "Subcategory",
  categoryPlaceholder = "Select primary category",
  subcategoryPlaceholder = "Select subcategory",
  showClearButtons = false,
  className = "",
  height = "h-9",
  required = false
}: CategorySubcategorySelectProps) {
  const selectedCategory = categoryTree.find(cat => cat.id === selectedCategoryId)
  
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      <CategorySelect
        categories={categoryTree}
        value={selectedCategoryId}
        onValueChange={(value) => {
          onCategoryChange(value)
          // Clear subcategory when primary category changes
          if (selectedSubcategoryId && value !== selectedCategoryId) {
            onSubcategoryChange(undefined)
          }
        }}
        label={categoryLabel}
        placeholder={categoryPlaceholder}
        showClearButton={showClearButtons}
        height={height}
        required={required}
      />
      
      <CategorySelect
        categories={selectedCategory?.subcategories || []}
        value={selectedSubcategoryId}
        onValueChange={onSubcategoryChange}
        label={subcategoryLabel}
        placeholder={subcategoryPlaceholder}
        disabled={!selectedCategoryId || !selectedCategory?.subcategories?.length}
        showClearButton={showClearButtons}
        height={height}
      />
    </div>
  )
}