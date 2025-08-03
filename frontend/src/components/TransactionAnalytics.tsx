import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { TransactionSummary } from '../store/slices/transactionSlice';
import { Category } from '../store/slices/categorySlice';

interface TransactionAnalyticsProps {
  summary: TransactionSummary;
  categories: Category[];
}

const TransactionAnalytics: React.FC<TransactionAnalyticsProps> = ({ summary, categories }) => {
  // Prepare data for expense pie chart
  const expenseData = Object.entries(summary?.expense_by_category || {}).map(([categoryId, amount]) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return {
      name: category?.name || 'Uncategorized',
      value: amount,
      color: category?.color || '#808080',
    };
  }).sort((a, b) => b.value - a.value);

  // Prepare data for income pie chart
  const incomeData = Object.entries(summary?.income_by_category || {}).map(([categoryId, amount]) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return {
      name: category?.name || 'Uncategorized',
      value: amount,
      color: category?.color || '#808080',
    };
  }).sort((a, b) => b.value - a.value);

  // Prepare data for comparison bar chart
  const comparisonData = [
    {
      name: 'Income',
      amount: summary?.total_income || 0,
      fill: '#4CAF50',
    },
    {
      name: 'Expenses',
      amount: summary?.total_expenses || 0,
      fill: '#F44336',
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-3 border border-border rounded-md shadow-md">
          <p className="text-sm">{payload[0].name}</p>
          <p className="text-sm font-bold">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Income vs Expenses Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      {/* Savings Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Savings Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <h2 className={`text-4xl font-bold ${(summary?.net_amount || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary?.net_amount || 0)}
            </h2>
            <p className="text-muted-foreground mt-2">
              Net Savings
            </p>
            {(summary?.total_income || 0) > 0 && (
              <h3 className="text-2xl font-bold mt-6">
                {(((summary?.net_amount || 0) / (summary?.total_income || 1)) * 100).toFixed(1)}%
              </h3>
            )}
            <p className="text-muted-foreground">
              Savings Rate
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Expense Breakdown */}
      {expenseData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
      )}

      {/* Income Breakdown */}
      {incomeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Income Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={incomeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {incomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
      )}

      {/* Top Expense Categories */}
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Expense Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-4">
              {expenseData.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: item.color }}
                    />
                    <p className="text-sm">{item.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {formatCurrency(item.value)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {((item.value / (summary?.total_expenses || 1)) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TransactionAnalytics;