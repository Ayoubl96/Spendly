import React, { useState, useEffect } from 'react';
import { Input } from './input';
import { ArrowRightLeft } from 'lucide-react';
import { formatCurrency, parseCurrencyInput, calculateExchangeRate, applyExchangeRate, isSameCurrency } from '../../utils/currency';

interface CurrencyConversionEditorProps {
  originalAmount: string;
  originalCurrency: string;
  targetCurrency: string;
  exchangeRate?: number;
  onOriginalAmountChange: (amount: string) => void;
  onConvertedAmountChange?: (amount: number, rate: number) => void;
  isLoading?: boolean;
  className?: string;
}

export function CurrencyConversionEditor({
  originalAmount,
  originalCurrency,
  targetCurrency,
  exchangeRate = 1,
  onOriginalAmountChange,
  onConvertedAmountChange,
  isLoading = false,
  className = ''
}: CurrencyConversionEditorProps) {
  // Ensure exchangeRate is always a valid number
  const safeExchangeRate = typeof exchangeRate === 'number' && !isNaN(exchangeRate) ? exchangeRate : 1;
  const [convertedAmountInput, setConvertedAmountInput] = useState('');
  const [isEditingConverted, setIsEditingConverted] = useState(false);

  // Calculate converted amount when original amount or exchange rate changes
  useEffect(() => {
    if (!isEditingConverted) {
      const originalNum = parseCurrencyInput(originalAmount);
      const convertedNum = applyExchangeRate(originalNum, safeExchangeRate);
      setConvertedAmountInput(convertedNum.toFixed(targetCurrency === 'BTC' ? 8 : 2));
    }
  }, [originalAmount, safeExchangeRate, targetCurrency, isEditingConverted]);

  // Don't show if currencies are the same
  if (isSameCurrency(originalCurrency, targetCurrency)) {
    return null;
  }

  const handleConvertedAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConvertedAmountInput(value);
    setIsEditingConverted(true);

    const convertedNum = parseCurrencyInput(value);
    const originalNum = parseCurrencyInput(originalAmount);
    
    if (originalNum > 0 && onConvertedAmountChange) {
      const newRate = calculateExchangeRate(originalNum, convertedNum);
      onConvertedAmountChange(convertedNum, newRate);
    }
  };

  const handleConvertedAmountBlur = () => {
    // Format the input when user finishes editing
    const convertedNum = parseCurrencyInput(convertedAmountInput);
    setConvertedAmountInput(convertedNum.toFixed(targetCurrency === 'BTC' ? 8 : 2));
    setIsEditingConverted(false);
  };

  return (
    <div className={`border border-blue-200 rounded-lg p-4 bg-blue-50 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <ArrowRightLeft className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">
          Currency Conversion
        </span>
        {isLoading && (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        {/* Original Amount (Read-only display) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Amount ({originalCurrency})
          </label>
          <div className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium">
            {formatCurrency(originalAmount || 0, originalCurrency)}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ArrowRightLeft className="h-5 w-5 text-gray-400" />
        </div>

        {/* Converted Amount (Editable) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Converted ({targetCurrency})
          </label>
          <Input
            type="text"
            value={convertedAmountInput}
            onChange={handleConvertedAmountChange}
            onBlur={handleConvertedAmountBlur}
            placeholder={`0.00 ${targetCurrency}`}
            className="text-sm font-medium"
          />
        </div>
      </div>

      {/* Exchange Rate Display */}
      <div className="mt-3 pt-3 border-t border-blue-200">
        <div className="text-xs text-blue-700">
          <span className="font-medium">Exchange Rate:</span> 1 {originalCurrency} = {safeExchangeRate.toFixed(6)} {targetCurrency}
        </div>
      </div>
    </div>
  );
}