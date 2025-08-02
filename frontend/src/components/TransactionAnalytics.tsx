import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
} from '@mui/material';
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
  const expenseData = Object.entries(summary.expense_by_category).map(([categoryId, amount]) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return {
      name: category?.name || 'Uncategorized',
      value: amount,
      color: category?.color || '#808080',
    };
  }).sort((a, b) => b.value - a.value);

  // Prepare data for income pie chart
  const incomeData = Object.entries(summary.income_by_category).map(([categoryId, amount]) => {
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
      amount: summary.total_income,
      fill: '#4CAF50',
    },
    {
      name: 'Expenses',
      amount: summary.total_expenses,
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
        <Box
          sx={{
            backgroundColor: 'background.paper',
            p: 1,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Typography variant="body2">{payload[0].name}</Typography>
          <Typography variant="body2" fontWeight="bold">
            {formatCurrency(payload[0].value)}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Grid container spacing={3}>
      {/* Income vs Expenses Bar Chart */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Income vs Expenses
            </Typography>
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
      </Grid>

      {/* Savings Rate */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Savings Overview
            </Typography>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h2" color={summary.net_amount >= 0 ? 'success.main' : 'error.main'}>
                {formatCurrency(summary.net_amount)}
              </Typography>
              <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
                Net Savings
              </Typography>
              {summary.total_income > 0 && (
                <Typography variant="h4" sx={{ mt: 3 }}>
                  {((summary.net_amount / summary.total_income) * 100).toFixed(1)}%
                </Typography>
              )}
              <Typography variant="body1" color="textSecondary">
                Savings Rate
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Expense Breakdown */}
      {expenseData.length > 0 && (
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Expense Breakdown
              </Typography>
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
        </Grid>
      )}

      {/* Income Breakdown */}
      {incomeData.length > 0 && (
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Income Breakdown
              </Typography>
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
        </Grid>
      )}

      {/* Top Expense Categories */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Expense Categories
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {expenseData.slice(0, 5).map((item, index) => (
                <Grid item xs={12} key={index}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center">
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          backgroundColor: item.color,
                          mr: 2,
                        }}
                      />
                      <Typography variant="body1">{item.name}</Typography>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="body1" fontWeight="bold">
                        {formatCurrency(item.value)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {((item.value / summary.total_expenses) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default TransactionAnalytics;