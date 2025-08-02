import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  AttachMoney,
} from '@mui/icons-material';

const Dashboard: React.FC = () => {
  // Placeholder data - will be replaced with real data from API
  const summaryData = {
    totalIncome: 5000,
    totalExpenses: 3200,
    netIncome: 1800,
    netWorth: 25000,
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Financial Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Income Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp color="success" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Total Income
                </Typography>
              </Box>
              <Typography variant="h5" component="div">
                ${summaryData.totalIncome.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="success.main">
                +12% from last month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Expenses Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingDown color="error" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Total Expenses
                </Typography>
              </Box>
              <Typography variant="h5" component="div">
                ${summaryData.totalExpenses.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="error.main">
                +5% from last month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Net Income Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoney color="primary" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Net Income
                </Typography>
              </Box>
              <Typography variant="h5" component="div">
                ${summaryData.netIncome.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="primary.main">
                36% savings rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Net Worth Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccountBalance color="secondary" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Net Worth
                </Typography>
              </Box>
              <Typography variant="h5" component="div">
                ${summaryData.netWorth.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="secondary.main">
                +8% from last month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Transactions */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Transactions
            </Typography>
            <Typography color="text.secondary">
              Transaction list will be displayed here
            </Typography>
          </Paper>
        </Grid>

        {/* Budget Overview */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Budget Overview
            </Typography>
            <Typography color="text.secondary">
              Budget status will be displayed here
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;