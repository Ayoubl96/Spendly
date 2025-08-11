import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Layout components
import { AuthLayout } from './components/layouts/AuthLayout'
import { DashboardLayout } from './components/layouts/DashboardLayout'

// Page components
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { ExpensesPage } from './pages/expenses/ExpensesPage'
import { ExpenseImportPage } from './pages/expenses/ExpenseImportPage'
import { CategoriesPage } from './pages/categories/CategoriesPage'
import { BudgetOverviewPage } from './pages/budget/BudgetOverviewPage'
import { BudgetManagementPage } from './pages/budget/BudgetManagementPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { PaymentMethodsPage } from './pages/settings/PaymentMethodsPage'

// Auth protection
import { ProtectedRoute } from './components/auth/ProtectedRoute'

// Styles
import './index.css'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            {/* Auth routes */}
            <Route path="/auth/*" element={<AuthLayout />}>
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route index element={<Navigate to="login" replace />} />
            </Route>

            {/* Protected app routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="expenses/import" element={<ExpenseImportPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="budget" element={<BudgetOverviewPage />} />
              <Route path="budget/manage/:id" element={<BudgetManagementPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/payment-methods" element={<PaymentMethodsPage />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App