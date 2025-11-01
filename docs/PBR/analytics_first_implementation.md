# Product Requirements Brief: Expense Analytics Dashboard

  ## Overview
  Create an analytics section where users can visualize their expense trends over time using interactive line charts with
  flexible filtering and grouping options.

  ## Tech Stack
  - **Frontend**: React + TypeScript, Recharts, Tailwind CSS, Radix UI
  - **Backend**: FastAPI + SQLAlchemy + PostgreSQL
  - **Already Available**: Expense model with categories, subcategories, and date tracking

  ## Core Features

  ### 1. Line Chart Visualization
  - Display total expenses over time as a line chart
  - Support multiple time groupings: Day, Week, Month
  - Allow comparison of multiple categories on the same chart
  - Responsive and interactive tooltips showing exact values

  ### 2. Time Period Selection
  **Predefined Ranges:**
  - Last 7 days
  - Last 30 days
  - Last 90 days
  - This month
  - This year
  - Last year

  **Custom Range:**
  - Date range picker (start date → end date)
  - Validation: End date must be after start date

  **Default View:** This year, grouped by month

  ### 3. Category Filtering
  - **All Categories** (default): Aggregate all expenses
  - **Single Category**: Select one category to analyze
  - **Multiple Categories**: Select 2+ categories to compare trends (each as a separate line)
  - **Subcategory Support**: When a category is selected, option to drill down to specific subcategories

  ### 4. Time Grouping
  - **By Day**: Show daily totals (best for 7-90 day ranges)
  - **By Week**: Show weekly totals (best for 30-365 day ranges)
  - **By Month**: Show monthly totals (best for 90+ day ranges, **DEFAULT**)

  ### 5. Comparison Features
  - **Previous Period Comparison**: Show previous period as a dashed line
    - Example: If viewing "Last 30 days", show the 30 days before that
    - Display percentage change in summary card

  ### 6. Export Functionality
  - **Export to CSV**: Raw data with date, category, amount

  ## UI Components Needed

  ### Main Page Components
  1. **AnalyticsPage** - Main container
  2. **TimeRangeSelector** - Predefined + custom date picker
  3. **CategoryMultiSelect** - Multi-select dropdown for categories
  4. **GroupingToggle** - Toggle between Day/Week/Month
  5. **ExpenseLineChart** - Recharts line chart component
  6. **AnalyticsSummaryCards** - Key metrics (total, average, change %)
  7. **ExportButtons** - CSV export button
  8. **PreviousPeriodToggle** - Checkbox to show/hide comparison

  ### Reusable Components (may already exist)
  - DatePicker (you have `date-picker.tsx`)
  - Select (you have `select.tsx`)
  - Card (you have `card.tsx`)
  - Button (you have `button.tsx`)

  ## Backend API Endpoints

  ### 1. Get Analytics Data
  GET /api/v1/analytics/expenses
  Query Parameters:
  - start_date: string (ISO format)
  - end_date: string (ISO format)
  - category_ids: array of UUIDs (optional, comma-separated)
  - group_by: enum ['day', 'week', 'month']
  - include_previous_period: boolean (default: false)

  Response:
  {
    "current_period": [
      {
        "date": "2025-01-01",
        "total_amount": "1234.56",
        "currency": "USD",
        "category_breakdowns": [
          {
            "category_id": "uuid",
            "category_name": "Food",
            "amount": "567.89"
          }
        ]
      }
    ],
    "previous_period": [...],  // if include_previous_period=true
    "summary": {
      "total_current": "12345.67",
      "total_previous": "10234.56",
      "change_percentage": "20.6",
      "currency": "USD"
    }
  }

  ### 2. Export Analytics Data
  GET /api/v1/analytics/expenses/export
  Query Parameters: Same as above + format: enum ['csv', 'pdf']
  Response: File download

  ## Database Queries Required
  All data available in existing `expenses` table:
  - Filter by `expense_date` between start_date and end_date
  - Filter by `category_id` IN category_ids (if provided)
  - Group by date truncated to day/week/month
  - Sum `amount` for each group
  - Join with `categories` table for category names

  ## Implementation Phases

  ### Phase 1: Backend - Basic Analytics Endpoint
  **Files to create/modify:**
  - `backend/app/schemas/analytics.py` - Request/response schemas
  - `backend/app/crud/crud_analytics.py` - Database queries
  - `backend/app/api/routes/analytics.py` - API endpoints

  **Steps:**
  1. Define Pydantic schemas for analytics request/response
  2. Implement CRUD function to query expenses with date grouping
  3. Create GET endpoint `/api/v1/analytics/expenses`
  4. Test with Postman/curl with sample date ranges
  5. Add category filtering logic
  6. Implement previous period comparison logic

  ### Phase 2: Frontend - Basic Chart
  **Files to create:**
  - `frontend/src/pages/analytics/AnalyticsPage.tsx`
  - `frontend/src/components/analytics/ExpenseLineChart.tsx`
  - `frontend/src/components/analytics/TimeRangeSelector.tsx`
  - `frontend/src/hooks/useAnalytics.ts` - React Query hook
  - `frontend/src/services/analyticsService.ts` - API calls

  **Steps:**
  1. Create analytics page route in `App.tsx`
  2. Create analytics API service with TypeScript types
  3. Create useAnalytics React Query hook
  4. Build basic ExpenseLineChart with Recharts
  5. Add TimeRangeSelector with predefined ranges
  6. Connect chart to API data
  7. Add loading and error states

  ### Phase 3: Advanced Filtering
  **Files to modify:**
  - `frontend/src/components/analytics/CategoryMultiSelect.tsx` (new)
  - `frontend/src/components/analytics/GroupingToggle.tsx` (new)
  - `frontend/src/pages/analytics/AnalyticsPage.tsx`

  **Steps:**
  1. Create multi-select category filter using Radix Select
  2. Add grouping toggle (Day/Week/Month buttons)
  3. Update API calls to include filters
  4. Update chart to show multiple category lines with different colors
  5. Add legend to chart

  ### Phase 4: Comparison & Summary
  **Files to modify:**
  - `frontend/src/components/analytics/AnalyticsSummaryCards.tsx` (new)
  - `frontend/src/components/analytics/ExpenseLineChart.tsx`
  - Update backend to calculate previous period

  **Steps:**
  1. Add "Compare with previous period" checkbox
  2. Modify backend to return previous period data
  3. Add dashed line to chart for previous period
  4. Create summary cards showing:
     - Total current period
     - Total previous period
     - Percentage change
     - Average per day/week/month
  5. Style cards with Tailwind

  ### Phase 5: Export Functionality
  **Files to create:**
  - `backend/app/services/export_service.py`
  - `frontend/src/components/analytics/ExportButtons.tsx`

  **Steps:**
  1. Backend: Create CSV export endpoint
  3. Frontend: Add export button
  4. Frontend: Handle file downloads
  5. Add loading states during export

  ### Phase 6: Polish & Optimization
  **Steps:**
  1. Add custom date range picker
  2. Add empty states (no data)
  3. Add responsive design for mobile
  4. Add animations to chart
  5. Add data caching with React Query
  6. Add error handling
  7. Add subcategory drill-down
  8. Performance testing with large datasets
