import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Switch,
  InputAdornment,
  Alert,
  Snackbar,
  Tooltip,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileUpload as FileUploadIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchTransactions,
  fetchTransactionSummary,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  importTransactions,
  Transaction,
} from '../store/slices/transactionSlice';
import { fetchCategories } from '../store/slices/categorySlice';
import CategoryManager from '../components/CategoryManager';
import TransactionAnalytics from '../components/TransactionAnalytics';
import { API_URL } from '../config/constants';

const Transactions: React.FC = () => {
  const dispatch = useAppDispatch();
  const { transactions, summary, isLoading, error, totalCount } = useAppSelector(
    (state) => state.transactions
  );
  const { categories } = useAppSelector((state) => state.categories);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filter state
  const [filters, setFilters] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    categoryId: '',
    transactionType: '',
    search: '',
  });

  // View state
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Dialog states
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    date: new Date(),
    description: '',
    type: 'expense' as 'income' | 'expense',
    category_id: '',
    recurring: false,
    recurring_frequency: '',
    tags: '',
  });

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);

  // Notification state
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'success' });

  // Fetch data on component mount and filter changes
  useEffect(() => {
    dispatch(fetchCategories());
    loadTransactions();
    loadSummary();
  }, [filters, page, rowsPerPage]);

  const loadTransactions = () => {
    dispatch(
      fetchTransactions({
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        start_date: format(filters.startDate, 'yyyy-MM-dd'),
        end_date: format(filters.endDate, 'yyyy-MM-dd'),
        category_id: filters.categoryId || undefined,
        transaction_type: filters.transactionType as 'income' | 'expense' || undefined,
        search: filters.search || undefined,
      })
    );
  };

  const loadSummary = () => {
    dispatch(
      fetchTransactionSummary({
        start_date: format(filters.startDate, 'yyyy-MM-dd'),
        end_date: format(filters.endDate, 'yyyy-MM-dd'),
      })
    );
  };

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setFormData({
      amount: '',
      currency: 'USD',
      date: new Date(),
      description: '',
      type: 'expense',
      category_id: '',
      recurring: false,
      recurring_frequency: '',
      tags: '',
    });
    setOpenAddDialog(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      amount: transaction.amount.toString(),
      currency: transaction.currency,
      date: parseISO(transaction.date),
      description: transaction.description || '',
      type: transaction.type,
      category_id: transaction.category_id || '',
      recurring: transaction.recurring,
      recurring_frequency: transaction.recurring_frequency || '',
      tags: transaction.tags || '',
    });
    setOpenAddDialog(true);
  };

  const handleSaveTransaction = async () => {
    try {
      const data = {
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        date: format(formData.date, 'yyyy-MM-dd'),
        description: formData.description || undefined,
        type: formData.type,
        category_id: formData.category_id || undefined,
        recurring: formData.recurring,
        recurring_frequency: formData.recurring ? formData.recurring_frequency : undefined,
        tags: formData.tags || undefined,
      };

      if (editingTransaction) {
        await dispatch(updateTransaction({ id: editingTransaction.id, data })).unwrap();
        showNotification('Transaction updated successfully', 'success');
      } else {
        await dispatch(createTransaction(data)).unwrap();
        showNotification('Transaction created successfully', 'success');
      }

      setOpenAddDialog(false);
      loadTransactions();
      loadSummary();
    } catch (error) {
      showNotification('Failed to save transaction', 'error');
    }
  };

  const handleDeleteTransaction = async () => {
    if (deleteConfirmId) {
      try {
        await dispatch(deleteTransaction(deleteConfirmId)).unwrap();
        showNotification('Transaction deleted successfully', 'success');
        setDeleteConfirmId(null);
        loadTransactions();
        loadSummary();
      } catch (error) {
        showNotification('Failed to delete transaction', 'error');
      }
    }
  };

  const handleImportFile = async () => {
    if (importFile) {
      try {
        await dispatch(importTransactions(importFile)).unwrap();
        showNotification('Transactions imported successfully', 'success');
        setOpenImportDialog(false);
        setImportFile(null);
        loadTransactions();
        loadSummary();
      } catch (error) {
        showNotification('Failed to import transactions', 'error');
      }
    }
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'info') => {
    setNotification({ open: true, message, severity });
  };

  const getFilteredCategories = () => {
    return categories.filter((cat) => cat.type === formData.type);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Transactions</Typography>
          <Box>
            <Button
              variant={showAnalytics ? 'contained' : 'outlined'}
              onClick={() => setShowAnalytics(!showAnalytics)}
              sx={{ mr: 2 }}
            >
              {showAnalytics ? 'Show List' : 'Show Analytics'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setOpenCategoryDialog(true)}
              sx={{ mr: 2 }}
            >
              Categories
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileUploadIcon />}
              onClick={() => setOpenImportDialog(true)}
              sx={{ mr: 2 }}
            >
              Import
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddTransaction}
            >
              Add Transaction
            </Button>
          </Box>
        </Box>

        {/* Summary Cards */}
        {summary && !showAnalytics && (
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Total Income
                      </Typography>
                      <Typography variant="h5" color="success.main">
                        {formatCurrency(summary.total_income)}
                      </Typography>
                    </Box>
                    <IncomeIcon color="success" fontSize="large" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Total Expenses
                      </Typography>
                      <Typography variant="h5" color="error.main">
                        {formatCurrency(summary.total_expenses)}
                      </Typography>
                    </Box>
                    <ExpenseIcon color="error" fontSize="large" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Net Amount
                      </Typography>
                      <Typography
                        variant="h5"
                        color={summary.net_amount >= 0 ? 'success.main' : 'error.main'}
                      >
                        {formatCurrency(summary.net_amount)}
                      </Typography>
                    </Box>
                    <MoneyIcon fontSize="large" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Transactions
                      </Typography>
                      <Typography variant="h5">{summary.transaction_count}</Typography>
                    </Box>
                    <FilterIcon fontSize="large" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Analytics View */}
        {showAnalytics && summary && (
          <TransactionAnalytics summary={summary} categories={categories} />
        )}

        {/* Filters - only show in list view */}
        {!showAnalytics && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={2}>
                  <DatePicker
                    label="Start Date"
                    value={filters.startDate}
                    onChange={(date) => date && setFilters({ ...filters, startDate: date })}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <DatePicker
                    label="End Date"
                    value={filters.endDate}
                    onChange={(date) => date && setFilters({ ...filters, endDate: date })}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={filters.categoryId}
                      onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                      label="Category"
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      {categories.map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={filters.transactionType}
                      onChange={(e) => setFilters({ ...filters, transactionType: e.target.value })}
                      label="Type"
                    >
                      <MenuItem value="">All Types</MenuItem>
                      <MenuItem value="income">Income</MenuItem>
                      <MenuItem value="expense">Expense</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Search"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Transactions Table - only show in list view */}
        {!showAnalytics && (
          <Card>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Tags</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="textSecondary">No transactions found</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{format(parseISO(transaction.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">{transaction.description || '-'}</Typography>
                            {transaction.recurring && (
                              <Chip
                                size="small"
                                label={`Recurring ${transaction.recurring_frequency}`}
                                color="info"
                                sx={{ mt: 0.5 }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {transaction.category ? (
                            <Chip
                              label={transaction.category.name}
                              size="small"
                              style={{
                                backgroundColor: transaction.category.color,
                                color: '#fff',
                              }}
                            />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={transaction.type}
                            size="small"
                            color={transaction.type === 'income' ? 'success' : 'error'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                            fontWeight="medium"
                          >
                            {transaction.type === 'expense' ? '-' : '+'}
                            {formatCurrency(transaction.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {transaction.tags ? (
                            <Stack direction="row" spacing={0.5}>
                              {transaction.tags.split(',').map((tag, index) => (
                                <Chip key={index} label={tag.trim()} size="small" variant="outlined" />
                              ))}
                            </Stack>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleEditTransaction(transaction)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => setDeleteConfirmId(transaction.id)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
              />
            </TableContainer>
          </Card>
        )}

        {/* Add/Edit Transaction Dialog */}
        <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense', category_id: '' })}
                    label="Type"
                  >
                    <MenuItem value="income">Income</MenuItem>
                    <MenuItem value="expense">Expense</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date"
                  value={formData.date}
                  onChange={(date) => date && setFormData({ ...formData, date })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    label="Category"
                  >
                    <MenuItem value="">No Category</MenuItem>
                    {getFilteredCategories().map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tags (comma-separated)"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., groceries, monthly, utilities"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.recurring}
                      onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                    />
                  }
                  label="Recurring Transaction"
                />
              </Grid>
              {formData.recurring && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Frequency</InputLabel>
                    <Select
                      value={formData.recurring_frequency}
                      onChange={(e) => setFormData({ ...formData, recurring_frequency: e.target.value })}
                      label="Frequency"
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="yearly">Yearly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveTransaction} variant="contained" disabled={!formData.amount || !formData.type}>
              {editingTransaction ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={openImportDialog} onClose={() => setOpenImportDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Import Transactions</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Upload a CSV or Excel file with your transactions. The file should contain columns for:
                date, amount, description, type (income/expense), and optionally category.
              </Typography>
              <Box sx={{ mt: 2, mb: 2 }}>
                <Button
                  variant="text"
                  startIcon={<DownloadIcon />}
                  onClick={() => {
                    window.open(`${API_URL}/transactions/import/template`, '_blank');
                  }}
                  color="primary"
                >
                  Download Sample Template
                </Button>
              </Box>
              <Button
                variant="outlined"
                component="label"
                startIcon={<FileUploadIcon />}
                fullWidth
                sx={{ mt: 2 }}
              >
                Select File
                <input
                  type="file"
                  hidden
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
              </Button>
              {importFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected: {importFile.name}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenImportDialog(false)}>Cancel</Button>
            <Button onClick={handleImportFile} variant="contained" disabled={!importFile}>
              Import
            </Button>
          </DialogActions>
        </Dialog>

        {/* Category Manager Dialog */}
        <CategoryManager 
          open={openCategoryDialog} 
          onClose={() => setOpenCategoryDialog(false)} 
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this transaction?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button onClick={handleDeleteTransaction} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={() => setNotification({ ...notification, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setNotification({ ...notification, open: false })}
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default Transactions;