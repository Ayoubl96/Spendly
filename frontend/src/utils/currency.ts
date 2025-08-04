/**
 * Currency utility functions for consistent formatting and calculations
 */

/**
 * Format currency amount with symbol
 */
export const formatCurrency = (amount: number | string, currencyCode: string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return '0.00';

  // Currency symbols mapping
  const currencySymbols: { [key: string]: string } = {
    'USD': '$',
    'EUR': '€',
    'MAD': 'MAD',
    'BTC': '₿'
  };

  const symbol = currencySymbols[currencyCode] || currencyCode;
  
  // For BTC, show more decimal places
  const decimals = currencyCode === 'BTC' ? 8 : 2;
  
  // Format the number
  const formatted = numAmount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return `${symbol}${formatted}`;
};

/**
 * Parse currency input and return numeric value
 */
export const parseCurrencyInput = (input: string): number => {
  // Remove currency symbols and spaces, keep only numbers and decimal point
  const cleaned = input.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Calculate exchange rate from two amounts
 */
export const calculateExchangeRate = (fromAmount: number, toAmount: number): number => {
  if (fromAmount === 0) return 0;
  return toAmount / fromAmount;
};

/**
 * Apply exchange rate to an amount
 */
export const applyExchangeRate = (amount: number, exchangeRate: number): number => {
  return amount * exchangeRate;
};

/**
 * Check if two currency codes are the same
 */
export const isSameCurrency = (currency1: string, currency2: string): boolean => {
  return currency1?.toUpperCase() === currency2?.toUpperCase();
};

/**
 * Get currency display name
 */
export const getCurrencyDisplayName = (currencyCode: string): string => {
  const currencyNames: { [key: string]: string } = {
    'USD': 'US Dollar',
    'EUR': 'Euro',
    'MAD': 'Moroccan Dirham',
    'BTC': 'Bitcoin'
  };
  
  return currencyNames[currencyCode] || currencyCode;
};

/**
 * Safely convert a value to a number (handles strings from API)
 */
export const safeNumberConversion = (value: any, defaultValue: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};