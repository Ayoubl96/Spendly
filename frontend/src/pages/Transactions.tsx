import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';
import {
  Plus as AddIcon,
  Edit as EditIcon,
  Trash2 as DeleteIcon,
  Upload as FileUploadIcon,
  Download as DownloadIcon,
  Filter as FilterIcon,
  Search as SearchIcon,
  DollarSign as MoneyIcon,
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  Loader2,
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
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
  const { transactions, summary, isLoading, totalCount } = useAppSelector(
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
    categoryId: 'all',
    transactionType: 'all',
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

  const { toast } = useToast();

  const loadTransactions = useCallback(() => {
    dispatch(
      fetchTransactions({
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        start_date: format(filters.startDate, 'yyyy-MM-dd'),
        end_date: format(filters.endDate, 'yyyy-MM-dd'),
        category_id: filters.categoryId === 'all' ? undefined : filters.categoryId,
        transaction_type: filters.transactionType === 'all' ? undefined : filters.transactionType as 'income' | 'expense',
        search: filters.search || undefined,
      })
    );
  }, [dispatch, page, rowsPerPage, filters]);

  const loadSummary = useCallback(() => {
    dispatch(
      fetchTransactionSummary({
        start_date: format(filters.startDate, 'yyyy-MM-dd'),
        end_date: format(filters.endDate, 'yyyy-MM-dd'),
      })
    );
  }, [dispatch, filters]);

  // Fetch data on component mount and filter changes
  useEffect(() => {
    dispatch(fetchCategories());
    loadTransactions();
    loadSummary();
  }, [dispatch, loadTransactions, loadSummary]);

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setFormData({
      amount: '',
      currency: 'USD',
      date: new Date(),
      description: '',
      type: 'expense',
      category_id: 'none',
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
      category_id: transaction.category_id || 'none',
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
        category_id: formData.category_id === 'none' ? undefined : formData.category_id,
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
    toast({
      title: message,
      variant: severity === 'error' ? 'destructive' : 'default',
    });
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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Transactions</h1>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={showAnalytics ? 'default' : 'outline'}
              onClick={() => setShowAnalytics(!showAnalytics)}
            >
              {showAnalytics ? 'Show List' : 'Show Analytics'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpenCategoryDialog(true)}
            >
              <FilterIcon className="mr-2 h-4 w-4" />
              Categories
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpenImportDialog(true)}
            >
              <FileUploadIcon className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button
              onClick={handleAddTransaction}
            >
              <AddIcon className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && !showAnalytics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Income
                    </p>
                    <h3 className="text-2xl font-bold text-green-600">
                      {formatCurrency(summary.total_income)}
                    </h3>
                  </div>
                  <IncomeIcon className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Expenses
                    </p>
                    <h3 className="text-2xl font-bold text-red-600">
                      {formatCurrency(summary.total_expenses)}
                    </h3>
                  </div>
                  <ExpenseIcon className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Net Amount
                    </p>
                    <h3 className={`text-2xl font-bold ${summary.net_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.net_amount)}
                    </h3>
                  </div>
                  <MoneyIcon className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Transactions
                    </p>
                    <h3 className="text-2xl font-bold">{summary.transaction_count}</h3>
                  </div>
                  <FilterIcon className="h-8 w-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analytics View */}
        {showAnalytics && summary && (
          <TransactionAnalytics summary={summary} categories={categories} />
        )}

        {/* Filters - only show in list view */}
        {!showAnalytics && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <div className="relative">
                    <Input
                      id="start-date"
                      type="text"
                      value={filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : ''}
                      readOnly
                      className="pr-8"
                    />
                    <DatePicker
                      selected={filters.startDate}
                      onChange={(date: Date | null) => date && setFilters({ ...filters, startDate: date })}
                      customInput={<span className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer">📅</span>}
                      dateFormat="yyyy-MM-dd"
                      placeholderText="Select start date"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <div className="relative">
                    <Input
                      id="end-date"
                      type="text"
                      value={filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : ''}
                      readOnly
                      className="pr-8"
                    />
                    <DatePicker
                      selected={filters.endDate}
                      onChange={(date: Date | null) => date && setFilters({ ...filters, endDate: date })}
                      customInput={<span className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer">📅</span>}
                      dateFormat="yyyy-MM-dd"
                      placeholderText="Select end date"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category-filter">Category</Label>
                  <Select value={filters.categoryId} onValueChange={(value) => setFilters({ ...filters, categoryId: value })}>
                    <SelectTrigger id="category-filter">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type-filter">Type</Label>
                  <Select value={filters.transactionType} onValueChange={(value) => setFilters({ ...filters, transactionType: value })}>
                    <SelectTrigger id="type-filter">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      type="text"
                      placeholder="Search transactions..."
                      value={filters.search}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions Table - only show in list view */}
        {!showAnalytics && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Description</th>
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-left p-4 font-medium">Type</th>
                      <th className="text-right p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">Tags</th>
                      <th className="text-center p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-muted/25">
                          <td className="p-4">{format(parseISO(transaction.date), 'MMM dd, yyyy')}</td>
                          <td className="p-4">
                            <div>
                              <p className="text-sm">{transaction.description || '-'}</p>
                              {transaction.recurring && (
                                <span className="inline-flex items-center px-2 py-1 mt-1 text-xs bg-blue-100 text-blue-800 rounded-md">
                                  Recurring {transaction.recurring_frequency}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            {transaction.category ? (
                              <span
                                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-white"
                                style={{ backgroundColor: transaction.category.color }}
                              >
                                {transaction.category.name}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${
                                transaction.type === 'income'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {transaction.type}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span
                              className={`text-sm font-medium ${
                                transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {transaction.type === 'expense' ? '-' : '+'}
                              {formatCurrency(transaction.amount)}
                            </span>
                          </td>
                          <td className="p-4">
                            {transaction.tags ? (
                              <div className="flex flex-wrap gap-1">
                                {transaction.tags.split(',').map((tag, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-800 border rounded-md"
                                  >
                                    {tag.trim()}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditTransaction(transaction)}
                                className="h-8 w-8 p-0"
                                title="Edit"
                              >
                                <EditIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteConfirmId(transaction.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete"
                              >
                                <DeleteIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page:</span>
                  <Select value={rowsPerPage.toString()} onValueChange={(value) => {
                    setRowsPerPage(parseInt(value, 10));
                    setPage(0);
                  }}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, totalCount)} of {totalCount}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 0}
                      className="h-8 w-8 p-0"
                    >
                      ‹
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= Math.ceil(totalCount / rowsPerPage) - 1}
                      className="h-8 w-8 p-0"
                    >
                      ›
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Transaction Dialog */}
        <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="transaction-type">Type</Label>
                <Select value={formData.type} onValueChange={(value: 'income' | 'expense') => setFormData({ ...formData, type: value, category_id: 'none' })}>
                  <SelectTrigger id="transaction-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="transaction-amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="transaction-amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, amount: e.target.value })}
                    className="pl-8"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="transaction-date">Date</Label>
                <div className="relative">
                  <Input
                    id="transaction-date"
                    type="text"
                    value={formData.date ? format(formData.date, 'yyyy-MM-dd') : ''}
                    readOnly
                    className="pr-8"
                  />
                  <DatePicker
                    selected={formData.date}
                    onChange={(date: Date | null) => date && setFormData({ ...formData, date })}
                    customInput={<span className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer">📅</span>}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Select date"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="transaction-category">Category</Label>
                <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                  <SelectTrigger id="transaction-category">
                    <SelectValue placeholder="No Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {getFilteredCategories().map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="transaction-description">Description</Label>
                <textarea
                  id="transaction-description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Transaction description..."
                />
              </div>
              
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="transaction-tags">Tags (comma-separated)</Label>
                <Input
                  id="transaction-tags"
                  type="text"
                  value={formData.tags}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., groceries, monthly, utilities"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="recurring-checkbox"
                  checked={formData.recurring}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, recurring: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="recurring-checkbox">Recurring Transaction</Label>
              </div>
              
              {formData.recurring && (
                <div className="space-y-2">
                  <Label htmlFor="recurring-frequency">Frequency</Label>
                  <Select value={formData.recurring_frequency} onValueChange={(value) => setFormData({ ...formData, recurring_frequency: value })}>
                    <SelectTrigger id="recurring-frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTransaction} disabled={!formData.amount || !formData.type}>
                {editingTransaction ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={openImportDialog} onOpenChange={setOpenImportDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Import Transactions</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Upload a CSV or Excel file with your transactions. The file should contain columns for:
                date, amount, description, type (income/expense), and optionally category.
              </p>
              
              <Button
                variant="ghost"
                onClick={() => {
                  window.open(`${API_URL}/transactions/import/template`, '_blank');
                }}
                className="w-full justify-start"
              >
                <DownloadIcon className="mr-2 h-4 w-4" />
                Download Sample Template
              </Button>
              
              <Button variant="outline" className="w-full justify-start" asChild>
                <label>
                  <FileUploadIcon className="mr-2 h-4 w-4" />
                  Select File
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                </label>
              </Button>
              
              {importFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {importFile.name}
                </p>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenImportDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleImportFile} disabled={!importFile}>
                Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Category Manager Dialog */}
        <CategoryManager 
          open={openCategoryDialog} 
          onClose={() => setOpenCategoryDialog(false)} 
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
            </DialogHeader>
            
            <p className="py-4">Are you sure you want to delete this transaction?</p>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteTransaction}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Notification Snackbar */}
      </div>
  );
};

export default Transactions;