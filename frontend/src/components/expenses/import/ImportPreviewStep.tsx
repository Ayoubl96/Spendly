import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { CategorySelect, CategorySubcategorySelect } from '../../ui/category-select';
import { PaymentMethodSelect } from '../../ui/payment-method-select';
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

// Mini component for editing expense tags
interface ExpenseTagEditorProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
}

const ExpenseTagEditor: React.FC<ExpenseTagEditorProps> = ({ tags, onTagsChange, disabled }) => {
  const [newTag, setNewTag] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onTagsChange([...tags, newTag.trim()]);
      setNewTag('');
      setIsEditing(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="w-full max-w-48">
      {/* Display existing tags */}
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.map((tag, idx) => (
          <span
            key={idx}
            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
          >
            {tag}
            {!disabled && (
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 text-gray-600 hover:text-gray-800"
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      
      {/* Add new tag */}
      {!disabled && (
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                onBlur={() => {
                  if (newTag.trim()) handleAddTag();
                  else setIsEditing(false);
                }}
                placeholder="Add tag..."
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              + Add tag
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface ImportPreviewStepProps {
  previewData: ExpenseImportPreviewData;
  onImportConfirm: (expenses: ImportExpenseData[], createRules: boolean, genericTags?: string[]) => void;
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
  const [bulkPaymentMethodId, setBulkPaymentMethodId] = useState<string>('');
  const [selectedExpenses, setSelectedExpenses] = useState<Set<number>>(new Set());
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [genericTags, setGenericTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState<string>('');

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

  const handleBulkPaymentMethodUpdate = useCallback(() => {
    if (!bulkPaymentMethodId) return;
    
    const indicesToUpdate = selectedExpenses.size > 0 
      ? Array.from(selectedExpenses)
      : filteredExpenses.map((_, index) => index);

    setExpenses(prev => prev.map((expense, i) => 
      indicesToUpdate.includes(i) 
        ? { 
            ...expense, 
            payment_method_id: bulkPaymentMethodId
          }
        : expense
    ));
    
    setSelectedExpenses(new Set());
    setBulkPaymentMethodId('');
  }, [bulkPaymentMethodId, selectedExpenses, filteredExpenses]);

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

  const handleAddGenericTag = useCallback(() => {
    if (newTag.trim() && !genericTags.includes(newTag.trim())) {
      setGenericTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  }, [newTag, genericTags]);

  const handleRemoveGenericTag = useCallback((tagToRemove: string) => {
    setGenericTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  const handleExpenseTagUpdate = useCallback((index: number, tags: string[]) => {
    handleExpenseUpdate(index, { tags });
  }, [handleExpenseUpdate]);

  const handleConfirmImport = useCallback(() => {
    const expensesToImport = expenses.filter(expense => 
      !expense.excluded && !expense.is_duplicate
    );
    onImportConfirm(expensesToImport, createRules, genericTags);
  }, [expenses, createRules, genericTags, onImportConfirm]);

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
              className="flex-1 max-w-xl"
              height="h-8"
            />
            <Button
              onClick={handleBulkCategoryUpdate}
              disabled={!bulkCategoryId}
              size="sm"
            >
              <Tag className="w-4 h-4 mr-2" />
              Apply Categories
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Bulk Payment Method:</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <PaymentMethodSelect
              value={bulkPaymentMethodId || null}
              onChange={(value) => setBulkPaymentMethodId(value || '')}
              placeholder="Bulk assign payment method..."
              className="w-80 h-8"
            />
            <Button
              onClick={handleBulkPaymentMethodUpdate}
              disabled={!bulkPaymentMethodId}
              size="sm"
            >
              <Tag className="w-4 h-4 mr-2" />
              Apply Payment Method
            </Button>
          </div>
        </div>
      </Card>

      {/* Generic Tags Section */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Generic Tags (Applied to All Imported Expenses)
        </h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddGenericTag()}
              placeholder="Add a tag (e.g., business, personal, trip2024)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button
              onClick={handleAddGenericTag}
              disabled={!newTag.trim() || genericTags.includes(newTag.trim())}
              size="sm"
            >
              Add Tag
            </Button>
          </div>
          
          {/* Display current generic tags */}
          {genericTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {genericTags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveGenericTag(tag)}
                    className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 hover:bg-blue-300 text-blue-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          
          <p className="text-sm text-gray-500">
            These tags will be automatically added to all imported expenses, along with the default import tags.
          </p>
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
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
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
                    <PaymentMethodSelect
                      value={expense.payment_method_id || null}
                      onChange={(paymentMethodId) => handleExpenseUpdate(index, { 
                        payment_method_id: paymentMethodId || undefined
                      })}
                      placeholder="Select payment method..."
                      className="w-48 h-8"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ExpenseTagEditor 
                      tags={expense.tags || []}
                      onTagsChange={(tags) => handleExpenseTagUpdate(index, tags)}
                      disabled={expense.is_duplicate || expense.excluded}
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
