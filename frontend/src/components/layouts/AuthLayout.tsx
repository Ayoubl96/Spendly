import React from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { Card, CardContent } from '../ui/card'

export function AuthLayout() {
  const { isAuthenticated } = useAuthStore()

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 p-8 items-center justify-center">
        <div className="text-center text-white max-w-md">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">Spendly</h1>
            <div className="w-16 h-1 bg-white/30 mx-auto rounded"></div>
          </div>
          
          <h2 className="text-2xl font-semibold mb-4">
            Take Control of Your Finances
          </h2>
          
          <p className="text-white/90 text-lg leading-relaxed mb-8">
            Transform your Excel-based expense tracking into a modern, 
            intuitive web application. Track expenses, manage budgets, 
            and gain insights into your spending patterns.
          </p>
          
          <div className="grid grid-cols-1 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-white/60 rounded-full"></div>
              <span>Multi-currency expense tracking</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-white/60 rounded-full"></div>
              <span>Smart budget management</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-white/60 rounded-full"></div>
              <span>Detailed analytics & insights</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-white/60 rounded-full"></div>
              <span>Secure & private</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">Spendly</h1>
            <p className="text-muted-foreground">Your personal finance companion</p>
          </div>
          
          <Card className="border-2 shadow-lg">
            <CardContent className="p-8">
              <Outlet />
            </CardContent>
          </Card>
          
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              Secure, private, and designed for your financial freedom.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}