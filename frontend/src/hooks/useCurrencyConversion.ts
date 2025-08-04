import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api.service';
import { CurrencyConversionResponse } from '../types/api.types';
import { isSameCurrency } from '../utils/currency';

interface UseCurrencyConversionProps {
  amount: string | number;
  fromCurrency: string;
  toCurrency: string;
  enabled?: boolean;
  debounceMs?: number;
}

interface UseCurrencyConversionReturn {
  conversionData: CurrencyConversionResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCurrencyConversion({
  amount,
  fromCurrency,
  toCurrency,
  enabled = true,
  debounceMs = 500
}: UseCurrencyConversionProps): UseCurrencyConversionReturn {
  const [conversionData, setConversionData] = useState<CurrencyConversionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performConversion = useCallback(async () => {
    // Clear previous data
    setError(null);
    setConversionData(null);

    // Validation checks
    if (!enabled || !amount || !fromCurrency || !toCurrency) {
      return;
    }

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }

    // Same currency, no conversion needed
    if (isSameCurrency(fromCurrency, toCurrency)) {
      return;
    }

    setIsLoading(true);

    try {
      const conversion = await apiService.convertCurrency(
        numAmount,
        fromCurrency,
        toCurrency
      );
      setConversionData(conversion);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Currency conversion failed';
      setError(errorMessage);
      console.error('Currency conversion error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [amount, fromCurrency, toCurrency, enabled]);

  // Debounced effect for automatic conversion
  useEffect(() => {
    const timeoutId = setTimeout(performConversion, debounceMs);
    return () => clearTimeout(timeoutId);
  }, [performConversion, debounceMs]);

  return {
    conversionData,
    isLoading,
    error,
    refetch: performConversion
  };
}