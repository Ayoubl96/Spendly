import React from 'react';
import { formatCurrency } from '../../utils/currency';

interface CurrencyAmountDisplayProps {
  amount: number | string;
  currency: string;
  className?: string;
  showCurrencyCode?: boolean;
}

export function CurrencyAmountDisplay({ 
  amount, 
  currency, 
  className = '',
  showCurrencyCode = false 
}: CurrencyAmountDisplayProps) {
  const formattedAmount = formatCurrency(amount, currency);
  
  return (
    <span className={className}>
      {formattedAmount}
      {showCurrencyCode && currency !== 'USD' && currency !== 'EUR' && (
        <span className="ml-1 text-xs text-muted-foreground">
          {currency}
        </span>
      )}
    </span>
  );
}