import React from 'react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  RotateCcw,
  Eye,
  TrendingUp
} from 'lucide-react';
import { ExpenseImportResult } from '../../../types/api.types';

interface ImportResultStepProps {
  importResult: ExpenseImportResult;
  onStartOver: () => void;
  onViewExpenses: () => void;
}

export const ImportResultStep: React.FC<ImportResultStepProps> = ({
  importResult,
  onStartOver,
  onViewExpenses
}) => {
  const isSuccess = importResult.success && importResult.imported_count > 0;

  return (
    <div className="max-w-2xl mx-auto text-center">
      {/* Status Icon */}
      <div className="mb-6">
        {isSuccess ? (
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
        ) : (
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto" />
        )}
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {isSuccess ? 'Import Completed Successfully!' : 'Import Failed'}
      </h2>

      {/* Summary */}
      <p className="text-gray-600 mb-8">
        {isSuccess ? (
          `${importResult.imported_count} expenses have been imported to your account.`
        ) : (
          'There was an issue importing your expenses. Please check the errors below.'
        )}
      </p>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {importResult.imported_count}
              </p>
              <p className="text-sm text-gray-500">Imported</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {importResult.error_count}
              </p>
              <p className="text-sm text-gray-500">Errors</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {importResult.created_rule_ids.length}
              </p>
              <p className="text-sm text-gray-500">Rules Created</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Success Details */}
      {isSuccess && (
        <Card className="p-6 text-left mb-8 bg-green-50 border-green-200">
          <div className="space-y-4">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-green-900">Expenses Imported</h3>
                <p className="text-sm text-green-700 mt-1">
                  {importResult.imported_count} expenses have been added to your account and are now available in your expense list.
                </p>
              </div>
            </div>

            {importResult.created_rule_ids.length > 0 && (
              <div className="flex items-start">
                <TrendingUp className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-green-900">Categorization Rules Created</h3>
                  <p className="text-sm text-green-700 mt-1">
                    {importResult.created_rule_ids.length} automatic categorization rules were created to help with future imports.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Error Details */}
      {importResult.error_count > 0 && (
        <Card className="p-6 text-left mb-8 bg-red-50 border-red-200">
          <div className="space-y-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-900">Import Errors</h3>
                <p className="text-sm text-red-700 mt-1">
                  {importResult.error_count} expenses could not be imported due to the following issues:
                </p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="mt-4">
                <div className="bg-white rounded border border-red-200 max-h-32 overflow-y-auto">
                  {importResult.errors.slice(0, 5).map((error, index) => (
                    <div key={index} className="p-3 border-b border-red-100 last:border-b-0">
                      <p className="text-sm text-red-800">
                        Row {error.index + 1}: {error.error}
                      </p>
                    </div>
                  ))}
                  {importResult.errors.length > 5 && (
                    <div className="p-3 text-center">
                      <p className="text-xs text-red-600">
                        And {importResult.errors.length - 5} more errors...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Next Steps */}
      <Card className="p-6 text-left mb-8">
        <h3 className="font-medium text-gray-900 mb-4">What's Next?</h3>
        <div className="space-y-3">
          <div className="flex items-start">
            <Eye className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-700">
                <strong>Review your expenses:</strong> Check the imported expenses and make any necessary adjustments to categories or details.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-700">
                <strong>Categorization rules:</strong> The rules created during this import will automatically categorize similar transactions in future imports.
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <RotateCcw className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-700">
                <strong>Regular imports:</strong> Set up a routine to import your bank statements regularly to keep your expense tracking up to date.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          variant="outline"
          onClick={onStartOver}
          size="lg"
          className="px-8"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Import Another File
        </Button>

        <Button
          onClick={onViewExpenses}
          size="lg"
          className="px-8"
        >
          <Eye className="w-4 h-4 mr-2" />
          View My Expenses
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Tips */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">💡 Tips for Better Imports</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• Download the most recent statement format from your bank</p>
          <p>• Review and categorize a few expenses manually to improve auto-categorization</p>
          <p>• Import regularly to avoid large files and maintain better expense tracking</p>
        </div>
      </div>
    </div>
  );
};
