import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { useAuthStore } from '../../stores/auth.store'
import { useExpenseStore } from '../../stores/expense.store'
import { CreateExpenseRequest, CategoryTree } from '../../types/api.types'
import { X } from 'lucide-react'

interface ExpenseFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (expense: CreateExpenseRequest) => void
}

export function ExpenseForm({ isOpen, onClose, onSubmit }: ExpenseFormProps) {
  const { user } = useAuthStore()
  const { categoryTree, users, fetchCategoryTree, fetchUsers } = useExpenseStore()
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    subcategory: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    notes: '',
    location: '',
    vendor: '',
    isShared: false,
    tags: '',
    sharedWith: [] as string[]
  })

  // Fetch categories and users when component mounts
  useEffect(() => {
    if (isOpen) {
      if (categoryTree.length === 0) {
        fetchCategoryTree()
      }
      if (users.length === 0) {
        fetchUsers()
      }
    }
  }, [isOpen, categoryTree.length, users.length, fetchCategoryTree, fetchUsers])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.description || !formData.amount) {
      alert('Please fill in all required fields')
      return
    }

    onSubmit({
      description: formData.description,
      amount: parseFloat(formData.amount),
      currency: user?.defaultCurrency || 'EUR',
      expenseDate: formData.expenseDate,
      categoryId: formData.category || undefined,
      subcategoryId: formData.subcategory || undefined,
      paymentMethod: formData.paymentMethod as 'cash' | 'card' | 'bank_transfer' | 'other',
      notes: formData.notes || undefined,
      location: formData.location || undefined,
      vendor: formData.vendor || undefined,
      isShared: formData.isShared,
      sharedWith: formData.isShared && formData.sharedWith.length > 0 ? formData.sharedWith : undefined,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : undefined
    })

    // Reset form
    setFormData({
      description: '',
      amount: '',
      category: '',
      subcategory: '',
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      notes: '',
      location: '',
      vendor: '',
      isShared: false,
      tags: '',
      sharedWith: []
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, type, value } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: checked
        }
        
        // Reset shared users when isShared is unchecked
        if (name === 'isShared' && !checked) {
          newData.sharedWith = []
        }
        
        return newData
      })
    } else {
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: value
        }
        
        // Reset subcategory when category changes
        if (name === 'category') {
          newData.subcategory = ''
        }
        
        return newData
      })
    }
  }

  const handleUserToggle = (userId: string) => {
    setFormData(prev => {
      const newSharedWith = prev.sharedWith.includes(userId)
        ? prev.sharedWith.filter(id => id !== userId)
        : [...prev.sharedWith, userId]
      
      return {
        ...prev,
        sharedWith: newSharedWith
      }
    })
  }

  // Get primary categories and subcategories for selected category
  const primaryCategories = categoryTree
  const selectedCategory = categoryTree.find(cat => cat.id === formData.category)
  const subcategories = selectedCategory ? selectedCategory.subcategories : []

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 mt-0">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Add New Expense</CardTitle>
            <CardDescription>Track your spending</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium mb-1">
                  Description *
                </label>
                <Input
                  id="description"
                  name="description"
                  type="text"
                  placeholder="e.g., Coffee at Starbucks"
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium mb-1">
                  Amount *
                </label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="expenseDate" className="block text-sm font-medium mb-1">
                  Date
                </label>
                <Input
                  id="expenseDate"
                  name="expenseDate"
                  type="date"
                  value={formData.expenseDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label htmlFor="category" className="block text-sm font-medium mb-1">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select category</option>
                  {primaryCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="subcategory" className="block text-sm font-medium mb-1">
                  Subcategory
                </label>
                <select
                  id="subcategory"
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleChange}
                  disabled={!formData.category}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select subcategory</option>
                  {subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payment & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium mb-1">
                  Payment Method
                </label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="vendor" className="block text-sm font-medium mb-1">
                  Vendor
                </label>
                <Input
                  id="vendor"
                  name="vendor"
                  type="text"
                  placeholder="e.g., Starbucks, Amazon"
                  value={formData.vendor}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium mb-1">
                  Location
                </label>
                <Input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="e.g., Downtown, Mall"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium mb-1">
                  Tags
                </label>
                <Input
                  id="tags"
                  name="tags"
                  type="text"
                  placeholder="e.g., business, personal (comma separated)"
                  value={formData.tags}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
              />
            </div>

            {/* Shared expense */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  id="isShared"
                  name="isShared"
                  type="checkbox"
                  checked={formData.isShared}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <label htmlFor="isShared" className="text-sm font-medium">
                  Shared expense
                </label>
              </div>

              {/* User selection for shared expenses */}
              {formData.isShared && (
                <div className="ml-6 space-y-2">
                  <label className="text-sm font-medium">Share with:</label>
                  <div className="max-h-32 overflow-y-auto space-y-1 border rounded-md p-2">
                    {users.length > 0 ? (
                      users.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2">
                          <input
                            id={`user-${user.id}`}
                            type="checkbox"
                            checked={formData.sharedWith.includes(user.id)}
                            onChange={() => handleUserToggle(user.id)}
                            className="h-4 w-4 rounded border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          />
                          <label htmlFor={`user-${user.id}`} className="text-sm cursor-pointer">
                            {user.firstName} {user.lastName} ({user.email})
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No other users available</p>
                    )}
                  </div>
                  {formData.sharedWith.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Selected {formData.sharedWith.length} user(s)
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Add Expense
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}