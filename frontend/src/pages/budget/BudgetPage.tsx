import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { PlusCircle, PiggyBank, TrendingUp, AlertTriangle } from 'lucide-react'

export function BudgetPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budget</h1>
          <p className="text-muted-foreground">
            Set and track your spending budgets
          </p>
        </div>
        <Button className="gap-2" onClick={() => alert('Budget creation coming soon!')}>
          <PlusCircle className="h-4 w-4" />
          Create Budget
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Budget</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Not Set</div>
            <p className="text-xs text-muted-foreground">
              Create your first budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spent This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€0.00</div>
            <p className="text-xs text-muted-foreground">
              0% of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">On Track</div>
            <p className="text-xs text-muted-foreground">
              No budget set
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>
            Create and manage your spending budgets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <PiggyBank className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No budgets yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first budget to start tracking your spending limits.
            </p>
            <Button className="gap-2" onClick={() => alert('Budget creation feature coming soon!')}>
              <PlusCircle className="h-4 w-4" />
              Create Your First Budget
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}