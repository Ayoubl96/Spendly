import React from 'react'
import { X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Button } from './button'

interface Currency {
  code: string
  name: string
  symbol: string
}

interface CurrencySelectProps {
  currencies: Currency[]
  value?: string
  onValueChange: (value: string | undefined) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  showClearButton?: boolean
  className?: string
  height?: string
  required?: boolean
  showSymbol?: boolean
  showCode?: boolean
}

export function CurrencySelect({
  currencies,
  value,
  onValueChange,
  placeholder = "Select currency",
  label,
  disabled = false,
  showClearButton = false,
  className = "",
  height = "h-9",
  required = false,
  showSymbol = true,
  showCode = true
}: CurrencySelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="flex gap-2">
        <Select
          value={value || undefined}
          onValueChange={onValueChange}
          disabled={disabled}
        >
          <SelectTrigger className={`${height} flex-1 min-w-[120px]`}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((currency) => (
              <SelectItem key={currency.code} value={currency.code}>
                <span className="flex items-center gap-2">
                  {showSymbol && (
                    <span className="font-medium text-sm w-6 text-center">
                      {currency.symbol}
                    </span>
                  )}
                  <span className="flex-1">{currency.name}</span>
                  {showCode && (
                    <span className="text-gray-500 text-xs">({currency.code})</span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showClearButton && value && (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => onValueChange(undefined)}
            className={`${height} px-3 shrink-0 hover:bg-red-50 hover:text-red-600 border border-gray-300`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}