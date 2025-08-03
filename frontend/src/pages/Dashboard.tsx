import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { StatCard } from '../components/ui/stat-card';
import { Button } from '../components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  CreditCard,
  Plus,
  ChevronRight,
} from 'lucide-react';

const Dashboard: React.FC = () => {
  // Placeholder data - will be replaced with real data from API
  const summaryData = {
    totalIncome: 5000,
    totalExpenses: 3200,
    netIncome: 1800,
    netWorth: 25000,
  };

  const recentTransactions = [
    { id: 1, description: "Grocery Store", amount: -85.50, category: "Food", date: "Today" },
    { id: 2, description: "Salary Deposit", amount: 3200.00, category: "Income", date: "Yesterday" },
    { id: 3, description: "Electric Bill", amount: -120.00, category: "Utilities", date: "2 days ago" },
    { id: 4, description: "Coffee Shop", amount: -12.50, category: "Food", date: "3 days ago" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-4xl font-bold text-gradient">
            Financial Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's your financial overview.
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Transaction</span>
          </Button>
          <Button className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Set Budget</span>
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Income"
          value={`$${summaryData.totalIncome.toLocaleString()}`}
          description="This month"
          icon={TrendingUp}
          trend={{ value: 12, isPositive: true }}
          className="border-green-200 dark:border-green-800"
        />
        
        <StatCard
          title="Total Expenses"
          value={`$${summaryData.totalExpenses.toLocaleString()}`}
          description="This month"
          icon={TrendingDown}
          trend={{ value: 5, isPositive: false }}
          className="border-red-200 dark:border-red-800"
        />
        
        <StatCard
          title="Net Income"
          value={`$${summaryData.netIncome.toLocaleString()}`}
          description="36% savings rate"
          icon={DollarSign}
          trend={{ value: 8, isPositive: true }}
          className="border-blue-200 dark:border-blue-800"
        />
        
        <StatCard
          title="Net Worth"
          value={`$${summaryData.netWorth.toLocaleString()}`}
          description="Total assets"
          icon={PiggyBank}
          trend={{ value: 15, isPositive: true }}
          className="border-purple-200 dark:border-purple-800"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <Card className="glass-effect">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Recent Transactions</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        transaction.amount > 0 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      }`}>
                        {transaction.amount > 0 ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.category} • {transaction.date}
                        </p>
                      </div>
                    </div>
                    <div className={`font-semibold ${
                      transaction.amount > 0 
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Budget Overview */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <CreditCard className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Target className="h-4 w-4 mr-2" />
                Create Budget
              </Button>
            </CardContent>
          </Card>

          {/* Budget Overview */}
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle className="text-lg">Budget Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Food & Dining</span>
                    <span className="text-sm text-muted-foreground">$285 / $400</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '71%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Transportation</span>
                    <span className="text-sm text-muted-foreground">$120 / $200</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Entertainment</span>
                    <span className="text-sm text-muted-foreground">$180 / $150</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;