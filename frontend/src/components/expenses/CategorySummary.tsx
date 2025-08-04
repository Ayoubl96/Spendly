import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { CurrencyAmountDisplay } from '../ui/currency-amount-display'
import { useExpenseStore } from '../../stores/expense.store'
import { useAuthStore } from '../../stores/auth.store'
import { Expense } from '../../types/api.types'
import { IconRenderer } from '../../utils/iconRenderer'
import { PieChart as PieChartIcon, TrendingUp, FolderOpen, ChevronRight, Calendar } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
// Using native JavaScript Date functions for better compatibility

interface CategorySummaryProps {
  expenses: Expense[]
  dateRange?: {
    startDate?: string
    endDate?: string
  }
}

interface SubcategoryBreakdown {
  subcategoryId: string
  subcategoryName: string
  totalAmount: number
  expenseCount: number
  percentage: number
}

interface CategoryBreakdown {
  categoryId: string
  categoryName: string
  categoryColor?: string
  categoryIcon?: string
  totalAmount: number
  expenseCount: number
  percentage: number
  subcategories: SubcategoryBreakdown[]
  monthlyBreakdown: {
    month: string
    amount: number
    count: number
  }[]
}

export function CategorySummary({ expenses, dateRange }: CategorySummaryProps) {
  const { user } = useAuthStore()
  const { categoryTree, fetchCategoryTree } = useExpenseStore()
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchCategoryTree()
  }, [fetchCategoryTree])

  // Calculate category breakdown using categoryTree - only show primary categories
  const calculateCategoryBreakdown = (): CategoryBreakdown[] => {
    const totalAmount = expenses.reduce((sum, exp) => sum + (exp.amountInBaseCurrency || exp.amount), 0)

    // Get unique months from expenses
    const months = Array.from(new Set(
      expenses.map(exp => {
        const date = new Date(exp.expenseDate)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      })
    )).sort()

    // Process all primary categories from categoryTree
    const result = categoryTree.map(primaryCategory => {
      const categoryExpenses = expenses.filter(exp => {
        // Check if expense belongs to this primary category or any of its subcategories
        if (exp.categoryId === primaryCategory.id) return true
        return primaryCategory.subcategories.some(sub => exp.subcategoryId === sub.id || exp.categoryId === sub.id)
      })

      const categoryTotalAmount = categoryExpenses.reduce((sum, exp) => sum + (exp.amountInBaseCurrency || exp.amount), 0)
      
      // Only include subcategories that have expenses when calculating breakdown
      const subcategoriesWithExpenses = primaryCategory.subcategories
        .map(subcategory => {
          const subExpenses = expenses.filter(exp => exp.subcategoryId === subcategory.id || exp.categoryId === subcategory.id)
          const subTotalAmount = subExpenses.reduce((sum, exp) => sum + (exp.amountInBaseCurrency || exp.amount), 0)
          
          return {
            subcategoryId: subcategory.id,
            subcategoryName: subcategory.name,
            totalAmount: subTotalAmount,
            expenseCount: subExpenses.length,
            percentage: categoryTotalAmount > 0 ? (subTotalAmount / categoryTotalAmount) * 100 : 0
          }
        })
        .filter(sub => sub.expenseCount > 0) // Only include subcategories with expenses
        .sort((a, b) => b.totalAmount - a.totalAmount)

      return {
        categoryId: primaryCategory.id,
        categoryName: primaryCategory.name,
        categoryColor: primaryCategory.color,
        categoryIcon: primaryCategory.icon,
        totalAmount: categoryTotalAmount,
        expenseCount: categoryExpenses.length,
        percentage: totalAmount > 0 ? (categoryTotalAmount / totalAmount) * 100 : 0,
        subcategories: subcategoriesWithExpenses,
        monthlyBreakdown: months.map(month => {
          const monthExpenses = categoryExpenses.filter(exp => {
            const expenseDate = new Date(exp.expenseDate)
            const expenseMonth = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`
            return expenseMonth === month
          })
          return {
            month,
            amount: monthExpenses.reduce((sum, exp) => sum + (exp.amountInBaseCurrency || exp.amount), 0),
            count: monthExpenses.length
          }
        })
      }
    })
    .sort((a, b) => {
      // Sort by amount, but keep categories with expenses at the top
      if (a.totalAmount === 0 && b.totalAmount === 0) {
        return a.categoryName.localeCompare(b.categoryName)
      }
      if (a.totalAmount === 0) return 1
      if (b.totalAmount === 0) return -1
      return b.totalAmount - a.totalAmount
    })

    return result
  }

  const categoryBreakdown = calculateCategoryBreakdown()
  const totalAmount = categoryBreakdown.reduce((sum, cat) => sum + cat.totalAmount, 0)
  const totalExpenses = expenses.length

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  if (!categoryBreakdown.length) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <PieChart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No expense data</h3>
          <p className="text-muted-foreground">
            Add some expenses to see category breakdowns and monthly summaries.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            <CardTitle>Category Summary</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              List
            </Button>
            <Button
              variant={viewMode === 'chart' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('chart')}
            >
              <PieChartIcon className="h-4 w-4 mr-2" />
              Pie Chart
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold">
              <CurrencyAmountDisplay 
                amount={totalAmount} 
                currency={user?.defaultCurrency || 'EUR'}
              />
            </div>
            <p className="text-sm text-muted-foreground">Total Spent</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{totalExpenses}</div>
            <p className="text-sm text-muted-foreground">Total Expenses</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{categoryBreakdown.length}</div>
            <p className="text-sm text-muted-foreground">Categories</p>
          </div>
        </div>

        {/* Category Breakdown with Subcategories */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Spending by Category & Subcategory
          </h4>

          {viewMode === 'list' ? (
            <div className="space-y-2">
              {categoryBreakdown.map((category, index) => (
                <div key={category.categoryId} className={`border rounded-lg overflow-hidden ${category.totalAmount === 0 ? 'opacity-60 bg-gray-50' : ''}`}>
                  {/* Main Category Header */}
                  <div 
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${category.totalAmount === 0 ? 'hover:bg-gray-100' : ''}`}
                    onClick={() => toggleCategoryExpansion(category.categoryId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <ChevronRight 
                            className={`h-4 w-4 transition-transform ${
                              expandedCategories.has(category.categoryId) ? 'rotate-90' : ''
                            } ${category.totalAmount === 0 ? 'text-gray-400' : ''}`}
                          />
                          <IconRenderer 
                            icon={category.categoryIcon} 
                            className={category.totalAmount === 0 ? 'opacity-50' : ''} 
                            size={20} 
                          />
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ 
                              backgroundColor: category.categoryColor || '#6b7280',
                              opacity: category.totalAmount === 0 ? 0.5 : 1
                            }}
                          />
                        </div>
                        <div>
                          <h5 className={`font-medium ${category.totalAmount === 0 ? 'text-gray-600' : ''}`}>
                            {category.categoryName}
                            {category.totalAmount === 0 && (
                              <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-500">
                                No expenses
                              </span>
                            )}
                          </h5>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{category.expenseCount} expense{category.expenseCount !== 1 ? 's' : ''}</span>
                            {category.subcategories.length > 0 && (
                              <span>{category.subcategories.length} subcategorie{category.subcategories.length !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold text-lg ${category.totalAmount === 0 ? 'text-gray-500' : ''}`}>
                          <CurrencyAmountDisplay 
                            amount={category.totalAmount} 
                            currency={user?.defaultCurrency || 'EUR'}
                          />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {category.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(category.percentage, 0.5)}%`, // Minimum 0.5% width for visibility
                          backgroundColor: category.categoryColor || '#6b7280',
                          opacity: category.totalAmount === 0 ? 0.3 : 1
                        }}
                      />
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedCategories.has(category.categoryId) && (
                    <div className="border-t bg-gray-50/30">
                      {/* Subcategories */}
                      {category.subcategories.length > 0 && (
                        <div className="p-4 border-b">
                          <h6 className="font-medium mb-3 text-sm text-gray-700">Subcategories</h6>
                          <div className="space-y-2">
                            {category.subcategories.map(subcategory => (
                              <div key={subcategory.subcategoryId} className="flex items-center justify-between p-3 bg-white rounded border">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: category.categoryColor || '#6b7280', opacity: 0.7 }}
                                  />
                                  <div>
                                    <span className="font-medium text-sm">{subcategory.subcategoryName}</span>
                                    <div className="text-xs text-muted-foreground">
                                      {subcategory.expenseCount} expense{subcategory.expenseCount !== 1 ? 's' : ''}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-sm">
                                    <CurrencyAmountDisplay 
                                      amount={subcategory.totalAmount} 
                                      currency={user?.defaultCurrency || 'EUR'}
                                    />
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {subcategory.percentage.toFixed(1)}% of category
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Monthly Breakdown */}
                      <div className="p-4">
                        <h6 className="font-medium mb-3 flex items-center gap-2 text-sm text-gray-700">
                          <Calendar className="h-4 w-4" />
                          Monthly Breakdown
                        </h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {category.monthlyBreakdown
                            .filter(month => month.amount > 0)
                            .map(month => (
                              <div key={month.month} className="bg-white p-3 rounded border">
                                <div className="font-medium text-sm">
                                  {formatMonthLabel(month.month)}
                                </div>
                                <div className="text-lg font-bold">
                                  <CurrencyAmountDisplay 
                                    amount={month.amount} 
                                    currency={user?.defaultCurrency || 'EUR'}
                                  />
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {month.count} expense{month.count !== 1 ? 's' : ''}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pie Chart */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown.filter(cat => cat.totalAmount > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="totalAmount"
                      nameKey="categoryName"
                    >
                      {categoryBreakdown.filter(cat => cat.totalAmount > 0).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.categoryColor || `hsl(${index * 137.508}deg, 70%, 50%)`} 
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-white p-3 border rounded-lg shadow-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <IconRenderer icon={data.categoryIcon} size={16} />
                                <span className="font-semibold">{data.categoryName}</span>
                              </div>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between gap-4">
                                  <span>Amount:</span>
                                  <CurrencyAmountDisplay 
                                    amount={data.totalAmount} 
                                    currency={user?.defaultCurrency || 'EUR'}
                                  />
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span>Expenses:</span>
                                  <span>{data.expenseCount}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span>Percentage:</span>
                                  <span>{data.percentage.toFixed(1)}%</span>
                                </div>
                                {data.subcategories.length > 0 && (
                                  <div className="flex justify-between gap-4">
                                    <span>Subcategories:</span>
                                    <span>{data.subcategories.length}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend 
                      content={({ payload }) => (
                        <div className="flex flex-wrap justify-center gap-4 mt-4">
                          {payload?.map((entry, index) => (
                            <div key={`legend-${index}`} className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-sm text-gray-600">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category Details List - All Categories */}
              <div className="space-y-4">
                {/* Categories with Expenses */}
                {categoryBreakdown.filter(cat => cat.totalAmount > 0).length > 0 && (
                  <div>
                    <h5 className="font-medium text-sm text-gray-700 mb-2">Categories with Expenses</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categoryBreakdown.filter(cat => cat.totalAmount > 0).map((category, index) => (
                        <div key={category.categoryId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: category.categoryColor || `hsl(${index * 137.508}deg, 70%, 50%)` }}
                            />
                            <div>
                                                      <div className="flex items-center gap-1">
                          <IconRenderer icon={category.categoryIcon} size={14} />
                          <span className="font-medium text-sm">{category.categoryName}</span>
                        </div>
                              <div className="text-xs text-gray-600">
                                {category.expenseCount} expense{category.expenseCount !== 1 ? 's' : ''}
                                {category.subcategories.length > 0 && (
                                  <span> • {category.subcategories.length} sub</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-sm">
                              <CurrencyAmountDisplay 
                                amount={category.totalAmount} 
                                currency={user?.defaultCurrency || 'EUR'}
                              />
                            </div>
                            <div className="text-xs text-gray-600">
                              {category.percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Categories without Expenses */}
                {categoryBreakdown.filter(cat => cat.totalAmount === 0).length > 0 && (
                  <div>
                    <h5 className="font-medium text-sm text-gray-500 mb-2">Categories without Expenses</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {categoryBreakdown.filter(cat => cat.totalAmount === 0).map((category, index) => (
                        <div key={category.categoryId} className="flex items-center gap-2 p-2 bg-gray-100 rounded border border-gray-200">
                          <div
                            className="w-3 h-3 rounded-full opacity-50"
                            style={{ backgroundColor: category.categoryColor || '#9ca3af' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <IconRenderer icon={category.categoryIcon} size={12} className="opacity-60" />
                              <span className="font-medium text-xs text-gray-600 truncate">{category.categoryName}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              0 expenses
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}