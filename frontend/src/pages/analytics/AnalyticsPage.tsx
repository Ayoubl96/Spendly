import React, { useState, useEffect } from 'react'
import { TimeRangeSelector } from '../../components/analytics/TimeRangeSelector'
import { GroupingToggle } from '../../components/analytics/GroupingToggle'
import { CategoryMultiSelect } from '../../components/analytics/CategoryMultiSelect'
import { AnalyticsSummaryCards } from '../../components/analytics/AnalyticsSummaryCards'
import { ExpenseLineChart } from '../../components/analytics/ExpenseLineChart'
import { CategoryBarChart } from '../../components/analytics/CategoryBarChart'
import { ExportButtons } from '../../components/analytics/ExportButtons'
import { useAnalytics } from '../../hooks/useAnalytics'
import { TimeRangePreset, GroupByType, AnalyticsRequest, Category } from '../../types/api.types'
import { getTimeRange, formatDateForAPI } from '../../utils/timeRangeUtils'
import { apiService } from '../../services/api.service'

export const AnalyticsPage: React.FC = () => {
  // State for filters
  const [selectedPreset, setSelectedPreset] = useState<TimeRangePreset>('this_year')
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), 0, 1))
  const [endDate, setEndDate] = useState<Date>(new Date(new Date().getFullYear(), 11, 31))
  const [groupBy, setGroupBy] = useState<GroupByType>('month')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [includePreviousPeriod, setIncludePreviousPeriod] = useState(false)
  const [showByCategory, setShowByCategory] = useState(true)
  const [showBarChart, setShowBarChart] = useState(true)
  const [visibleCategories, setVisibleCategories] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  // Initialize with this year by default
  useEffect(() => {
    const range = getTimeRange('this_year')
    setStartDate(range.start_date)
    setEndDate(range.end_date)
  }, [])

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true)
        const cats = await apiService.getCategories()
        setCategories(cats.filter((cat) => !cat.parentId)) // Only parent categories
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      } finally {
        setCategoriesLoading(false)
      }
    }
    fetchCategories()
  }, [])

  // Build analytics request params
  const analyticsParams: AnalyticsRequest = {
    start_date: formatDateForAPI(startDate),
    end_date: formatDateForAPI(endDate),
    group_by: groupBy,
    category_ids: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
    include_previous_period: includePreviousPeriod
  }

  // Fetch analytics data
  const { data, isLoading, isError, error } = useAnalytics(analyticsParams)

  // Initialize visible categories when data loads
  useEffect(() => {
    if (data && data.current_period.length > 0) {
      const categoryNames = new Set<string>()
      data.current_period.forEach((dataPoint) => {
        if (dataPoint.category_breakdowns) {
          dataPoint.category_breakdowns.forEach((breakdown) => {
            categoryNames.add(breakdown.category_name)
          })
        }
      })
      // Initialize with all categories visible
      setVisibleCategories(Array.from(categoryNames))
    }
  }, [data])

  const handleRangeChange = (preset: TimeRangePreset, start: Date, end: Date) => {
    setSelectedPreset(preset)
    setStartDate(start)
    setEndDate(end)
  }

  const handleToggleCategoryVisibility = (categoryName: string) => {
    setVisibleCategories((prev) => {
      if (prev.includes(categoryName)) {
        // Don't allow hiding all categories
        if (prev.length === 1) return prev
        return prev.filter((cat) => cat !== categoryName)
      } else {
        return [...prev, categoryName]
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Expense Analytics</h1>
          <p className="mt-2 text-gray-600">
            Visualize and analyze your spending trends over time
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>

          {/* Time Range */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Period
            </label>
            <TimeRangeSelector
              selectedPreset={selectedPreset}
              customStartDate={startDate}
              customEndDate={endDate}
              onRangeChange={handleRangeChange}
            />
          </div>

          {/* Grouping and Categories */}
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group By
              </label>
              <GroupingToggle
                selectedGrouping={groupBy}
                onGroupingChange={setGroupBy}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories
              </label>
              <CategoryMultiSelect
                categories={categories.map((cat) => ({
                  id: cat.id,
                  name: cat.name,
                  icon: cat.icon
                }))}
                selectedCategoryIds={selectedCategoryIds}
                onSelectionChange={setSelectedCategoryIds}
                loading={categoriesLoading}
              />
            </div>

            <div className="flex flex-col gap-2 mt-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="comparePrevious"
                  checked={includePreviousPeriod}
                  onChange={(e) => setIncludePreviousPeriod(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="comparePrevious" className="ml-2 text-sm text-gray-700">
                  Compare with previous period
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showByCategory"
                  checked={showByCategory}
                  onChange={(e) => setShowByCategory(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="showByCategory" className="ml-2 text-sm text-gray-700">
                  Show category breakdown (Line Chart)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showBarChart"
                  checked={showBarChart}
                  onChange={(e) => setShowBarChart(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="showBarChart" className="ml-2 text-sm text-gray-700">
                  Show category bar chart
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow p-12 border border-gray-200 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading analytics data...</p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-red-800 font-semibold mb-2">Error loading analytics</h3>
            <p className="text-red-600">{error?.message || 'An unexpected error occurred'}</p>
          </div>
        )}

        {/* Data Display */}
        {data && !isLoading && (
          <>
            {/* Summary Cards */}
            <div className="mb-6">
              <AnalyticsSummaryCards summary={data.summary} />
            </div>

            {/* Line Chart */}
            <div className="mb-6">
              <ExpenseLineChart
                currentPeriodData={data.current_period}
                previousPeriodData={data.previous_period}
                groupBy={groupBy}
                currency={data.summary.currency}
                selectedCategoryIds={selectedCategoryIds}
                showByCategory={showByCategory}
                visibleCategories={visibleCategories}
                onToggleCategoryVisibility={handleToggleCategoryVisibility}
              />
            </div>

            {/* Bar Chart */}
            {showBarChart && (
              <div className="mb-6">
                <CategoryBarChart
                  currentPeriodData={data.current_period}
                  previousPeriodData={data.previous_period}
                  currency={data.summary.currency}
                  visibleCategories={visibleCategories}
                />
              </div>
            )}

            {/* Export Section */}
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Download your analytics data for further analysis
                  </p>
                </div>
                <ExportButtons analyticsParams={analyticsParams} />
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {data && data.current_period.length === 0 && !isLoading && (
          <div className="bg-white rounded-lg shadow p-12 border border-gray-200 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No data available</h3>
            <p className="text-gray-600">
              There are no expenses in the selected time period. Try adjusting your filters.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
