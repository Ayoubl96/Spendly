import React, { useCallback, useState } from 'react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Upload, FileText, AlertCircle, X } from 'lucide-react';

interface FileUploadStepProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  error?: string;
}

export const FileUploadStep: React.FC<FileUploadStepProps> = ({
  onFileUpload,
  isLoading,
  error
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  }, []);

  const handleUpload = useCallback(() => {
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
  }, [selectedFile, onFileUpload]);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Upload Your Bank Statement
        </h2>
        <p className="text-gray-600">
          We support Excel (.xlsx, .xls) and CSV files from major banks
        </p>
      </div>

      {/* Supported Banks Info */}
      <Card className="mb-6 p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900">Supported Formats</h3>
            <p className="text-sm text-blue-700 mt-1">
              Currently supported: Intesa San Paolo Excel exports. 
              More banks will be added soon.
            </p>
          </div>
        </div>
      </Card>

      {error && (
        <Card className="mb-6 p-4 bg-red-50 border-red-200">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-900">Upload Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* File Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : selectedFile
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <FileText className="w-12 h-12 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown type'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveFile}
              className="mt-2"
            >
              <X className="w-4 h-4 mr-2" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Upload className="w-12 h-12 text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drop your file here, or{' '}
                <label className="text-blue-600 hover:text-blue-500 cursor-pointer underline">
                  browse
                  <input
                    type="file"
                    className="sr-only"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    disabled={isLoading}
                  />
                </label>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Supports .xlsx, .xls, and .csv files up to 10MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Button */}
      {selectedFile && (
        <div className="mt-6 flex justify-center">
          <Button
            onClick={handleUpload}
            disabled={isLoading}
            size="lg"
            className="px-8"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Analyze File
              </>
            )}
          </Button>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 space-y-4 text-sm text-gray-600">
        <h3 className="font-medium text-gray-900">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-2 pl-4">
          <li>Download your bank statement in Excel or CSV format</li>
          <li>Upload the file using the area above</li>
          <li>Review and edit the detected transactions</li>
          <li>Confirm the import to add expenses to your account</li>
        </ol>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Privacy & Security</h4>
          <p className="text-sm text-gray-600">
            Your financial data is processed securely and never stored permanently. 
            Files are analyzed on our servers and deleted immediately after processing.
          </p>
        </div>
      </div>
    </div>
  );
};
