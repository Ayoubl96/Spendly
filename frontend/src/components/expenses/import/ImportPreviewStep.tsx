import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { CategorySelect, CategorySubcategorySelect } from '../../ui/category-select';
import { 
  CheckCircle, 
  AlertTriangle, 
  DollarSign, 
  Calendar, 
  Tag,
  Eye,
  EyeOff,
  Settings,
  Save
} from 'lucide-react';
import { ExpenseImportPreviewData, ImportExpenseData, CategoryTree } from '../../../types/api.types';
import { apiService } from '../../../services/api.service';

interface ImportPreviewStepProps {
  previewData: ExpenseImportPreviewData;
  onImportConfirm: (expenses: ImportExpenseData[], createRules: boolean) => void;
  onBack: () => void;
  isLoading: boolean;
}

export const ImportPreviewStep: React.FC<ImportPreviewStepProps> = ({
  previewData,
  onImportConfirm,
  onBack,
  isLoading
}) => {
  const [expenses, setExpenses] = useState(previewData.expenses);
  const [createRules, setCreateRules] = useState(true);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
  const [bulkSubcategoryId, setBulkSubcategoryId] = useState<string>('');
  const [selectedExpenses, setSelectedExpenses] = useState<Set<number>>(new Set());
  const [categories, setCategories] = useState<CategoryTree[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoryTree = await apiService.getCategoryTree();
        setCategories(categoryTree);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const filteredExpenses = useMemo(() => {
    if (showDuplicates) {
      return expenses;
    }
    return expenses.filter(expense => !expense.is_duplicate);
  }, [expenses, showDuplicates]);

  const summary = useMemo(() => {
    const visible = filteredExpenses.filter(e => !e.excluded);
    return {
      visible: visible.length,
      selected: visible.filter(e => !e.is_duplicate).length,
      total_amount: visible.reduce((sum, e) => sum + (e.is_duplicate ? 0 : e.amount), 0)
    };
  }, [filteredExpenses]);

  const handleExpenseUpdate = useCallback((index: number, updates: any) => {
    setExpenses(prev => prev.map((expense, i) => 
      i === index ? { ...expense, ...updates } : expense
    ));
  }, []);

  const handleBulkCategoryUpdate = useCallback(() => {
    if (!bulkCategoryId) return;
    
    const indicesToUpdate = selectedExpenses.size > 0 
      ? Array.from(selectedExpenses)
      : filteredExpenses.map((_, index) => index);

    setExpenses(prev => prev.map((expense, i) => 
      indicesToUpdate.includes(i) 
        ? { 
            ...expense, 
            category_id: bulkCategoryId, 
            subcategory_id: bulkSubcategoryId || undefined,
            create_rule: true 
          }
        : expense
    ));
    
    setSelectedExpenses(new Set());
    setBulkCategoryId('');
    setBulkSubcategoryId('');
  }, [bulkCategoryId, bulkSubcategoryId, selectedExpenses, filteredExpenses]);

  const handleSelectExpense = useCallback((index: number, selected: boolean) => {
    setSelectedExpenses(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(index);
      } else {
        newSet.delete(index);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIndices = filteredExpenses.map((_, index) => index);
    setSelectedExpenses(new Set(allIndices));
  }, [filteredExpenses]);

  const handleDeselectAll = useCallback(() => {
    setSelectedExpenses(new Set());
  }, []);

  const handleConfirmImport = useCallback(() => {
    const expensesToImport = expenses.filter(expense => 
      !expense.excluded && !expense.is_duplicate
    );
    onImportConfirm(expensesToImport, createRules);
  }, [expenses, createRules, onImportConfirm]);

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId)?.name || '';
  };

  const getSubcategoryName = (categoryId: string, subcategoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.subcategories?.find(sub => sub.id === subcategoryId)?.name || '';
  };

  if (!previewData.success) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to Parse File
        </h3>
        <p className="text-gray-600 mb-4">{previewData.error}</p>
        <Button onClick={onBack} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {previewData.summary.total_transactions}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">New Expenses</p>
              <p className="text-2xl font-bold text-gray-900">
                {previewData.summary.new_transactions}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Duplicates</p>
              <p className="text-2xl font-bold text-gray-900">
                {previewData.summary.duplicate_transactions}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.total_amount, previewData.summary.currency)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDuplicates(!showDuplicates)}
            >
              {showDuplicates ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showDuplicates ? 'Hide' : 'Show'} Duplicates
            </Button>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                Deselect All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setExpenses(prev => prev.map(expense => ({
                    ...expense,
                    category_id: expense.suggested_category_id || expense.category_id,
                    subcategory_id: expense.suggested_subcategory_id || expense.subcategory_id,
                    create_rule: true
                  })));
                }}
                disabled={expenses.filter(e => e.suggested_category_id || e.suggested_subcategory_id).length === 0}
              >
                Apply All Suggestions
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <CategorySubcategorySelect
              categoryTree={categories}
              selectedCategoryId={bulkCategoryId}
              selectedSubcategoryId={bulkSubcategoryId}
              onCategoryChange={(value) => setBulkCategoryId(value || '')}
              onSubcategoryChange={(value) => setBulkSubcategoryId(value || '')}
              categoryPlaceholder="Bulk assign category..."
              subcategoryPlaceholder="Bulk assign subcategory..."
              className="flex-1 max-w-2xl"
              height="h-8"
            />
            <Button
              onClick={handleBulkCategoryUpdate}
              disabled={!bulkCategoryId}
              size="sm"
            >
              <Tag className="w-4 h-4 mr-2" />
              Apply
            </Button>
          </div>
        </div>
      </Card>

      {/* Expenses Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedExpenses.size === filteredExpenses.length}
                    onChange={(e) => e.target.checked ? handleSelectAll() : handleDeselectAll()}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subcategory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.map((expense, index) => (
                <tr 
                  key={index} 
                  className={`${
                    expense.is_duplicate 
                      ? 'bg-red-50 opacity-60' 
                      : expense.excluded 
                      ? 'bg-gray-50 opacity-60'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedExpenses.has(index)}
                      onChange={(e) => handleSelectExpense(index, e.target.checked)}
                      disabled={expense.is_duplicate || expense.excluded}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(expense.expense_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(expense.amount, expense.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.vendor || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {expense.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <CategorySelect
                      categories={categories}
                      value={expense.category_id || ''}
                      onValueChange={(categoryId) => handleExpenseUpdate(index, { 
                        category_id: categoryId || '',
                        subcategory_id: '', // Clear subcategory when main category changes
                        create_rule: true 
                      })}
                      placeholder="Select category..."
                      disabled={expense.is_duplicate || expense.excluded}
                      height="h-8"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <CategorySelect
                      categories={categories.find(cat => cat.id === expense.category_id)?.subcategories || []}
                      value={expense.subcategory_id || ''}
                      onValueChange={(subcategoryId) => handleExpenseUpdate(index, { 
                        subcategory_id: subcategoryId || '',
                        create_rule: true 
                      })}
                      placeholder="Select subcategory..."
                      disabled={expense.is_duplicate || expense.excluded || !expense.category_id}
                      height="h-8"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {expense.suggestion_confidence > 0 && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getConfidenceColor(expense.suggestion_confidence)
                        }`}>
                          {expense.suggestion_confidence}%
                        </span>
                      )}
                      {(expense.suggested_category_id || expense.suggested_subcategory_id) && (
                        <div className="text-xs text-gray-500">
                          {expense.suggested_category_name && (
                            <div>→ {expense.suggested_category_name}</div>
                          )}
                          {expense.suggestion_reason && (
                            <div className="truncate max-w-32" title={expense.suggestion_reason}>
                              {expense.suggestion_reason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {expense.is_duplicate ? (
                        <span className="text-red-600 text-xs">Duplicate</span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExpenseUpdate(index, { 
                            excluded: !expense.excluded 
                          })}
                        >
                          {expense.excluded ? 'Include' : 'Exclude'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Settings */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Settings className="w-5 h-5 text-gray-500" />
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={createRules}
                  onChange={(e) => setCreateRules(e.target.checked)}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Create categorization rules for future imports
                </span>
              </label>
              <p className="text-xs text-gray-500 ml-6">
                Automatically categorize similar transactions in future imports
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        
        <div className="space-x-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">
              Importing {summary.selected} expenses totaling {formatCurrency(summary.total_amount, previewData.summary.currency)}
            </span>
            <span className="text-xs text-gray-500">
              {filteredExpenses.filter(e => !e.excluded && !e.is_duplicate && e.category_id).length} with categories, {' '}
              {filteredExpenses.filter(e => !e.excluded && !e.is_duplicate && e.subcategory_id).length} with subcategories
            </span>
          </div>
          <Button
            onClick={handleConfirmImport}
            disabled={isLoading || summary.selected === 0}
            size="lg"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Importing...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Import {summary.selected} Expenses
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
