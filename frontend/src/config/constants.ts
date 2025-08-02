export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001/api/v1';

export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
export const DISPLAY_DATE_FORMAT = 'MMM dd, yyyy';

export const CURRENCY_SYMBOL = '$';
export const DEFAULT_CURRENCY = 'USD';

export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
} as const;

export const ASSET_TYPES = {
  CASH: 'cash',
  SAVINGS: 'savings',
  INVESTMENT: 'investment',
  PROPERTY: 'property',
  VEHICLE: 'vehicle',
  CRYPTO: 'crypto',
  OTHER: 'other',
} as const;

export const BUDGET_PERIODS = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
} as const;