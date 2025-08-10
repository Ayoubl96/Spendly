import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { FileUploadStep } from '../../components/expenses/import/FileUploadStep';
import { ImportPreviewStep } from '../../components/expenses/import/ImportPreviewStep';
import { ImportResultStep } from '../../components/expenses/import/ImportResultStep';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { apiService } from '../../services/api.service';
import { ExpenseImportPreviewData, ExpenseImportResult, ImportExpenseData } from '../../types/api.types';

interface ImportStep {
  id: string;
  title: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed' | 'error';
}



export const ExpenseImportPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ExpenseImportPreviewData | null>(null);
  const [importResult, setImportResult] = useState<ExpenseImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const steps: ImportStep[] = [
    {
      id: 'upload',
      title: 'Upload File',
      icon: <Upload className="w-5 h-5" />,
      status: currentStep === 0 ? 'active' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'preview',
      title: 'Review & Edit',
      icon: <FileText className="w-5 h-5" />,
      status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'import',
      title: 'Import Complete',
      icon: <CheckCircle className="w-5 h-5" />,
      status: currentStep === 2 ? 'completed' : 'pending'
    }
  ];

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadedFile(file);
    setIsLoading(true);

    try {
      const data = await apiService.previewExpenseImport(file);
      setPreviewData(data);

      if (data.success) {
        setCurrentStep(1);
      } else {
        console.error('Preview failed:', data.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setPreviewData({
        success: false,
        expenses: [],
        summary: {
          total_transactions: 0,
          new_transactions: 0,
          duplicate_transactions: 0,
          total_amount: 0,
          currency: 'EUR',
          date_range: { start: '', end: '' },
          categorization_stats: { rule_matches: 0, heuristic_matches: 0, no_suggestions: 0 }
        },
        error: error instanceof Error ? error.message : 'Upload failed'
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleImportConfirm = useCallback(async (expensesToImport: ImportExpenseData[], createRules: boolean) => {
    setIsLoading(true);

    try {
      const result = await apiService.commitExpenseImport({
        expenses: expensesToImport,
        create_rules: createRules
      });
      setImportResult(result);
      setCurrentStep(2);
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        imported_count: 0,
        error_count: 1,
        imported_expense_ids: [],
        created_rule_ids: [],
        errors: [{ index: 0, error: error instanceof Error ? error.message : 'Import failed' }]
      });
      setCurrentStep(2);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStartOver = useCallback(() => {
    setCurrentStep(0);
    setUploadedFile(null);
    setPreviewData(null);
    setImportResult(null);
    setIsLoading(false);
  }, []);

  const getStepStatusIcon = (step: ImportStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'active':
        return step.icon;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Import Expenses</h1>
          <p className="mt-2 text-gray-600">
            Upload your bank statement to automatically import and categorize your expenses
          </p>
        </div>

        {/* Progress Steps */}
        <Card className="mb-8 p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  step.status === 'active' 
                    ? 'border-blue-600 bg-blue-50 text-blue-600' 
                    : step.status === 'completed'
                    ? 'border-green-600 bg-green-50 text-green-600'
                    : step.status === 'error'
                    ? 'border-red-600 bg-red-50 text-red-600'
                    : 'border-gray-300 bg-white text-gray-400'
                }`}>
                  {getStepStatusIcon(step)}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    step.status === 'active' || step.status === 'completed' 
                      ? 'text-gray-900' 
                      : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`mx-6 w-12 h-0.5 ${
                    index < currentStep ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Step Content */}
        <Card className="p-6">
          {currentStep === 0 && (
            <FileUploadStep
              onFileUpload={handleFileUpload}
              isLoading={isLoading}
              error={previewData?.error}
            />
          )}

          {currentStep === 1 && previewData && (
            <ImportPreviewStep
              previewData={previewData}
              onImportConfirm={handleImportConfirm}
              onBack={() => setCurrentStep(0)}
              isLoading={isLoading}
            />
          )}

          {currentStep === 2 && importResult && (
            <ImportResultStep
              importResult={importResult}
              onStartOver={handleStartOver}
              onViewExpenses={() => navigate('/expenses')}
            />
          )}
        </Card>
      </div>
    </div>
  );
};
