import React from 'react'
import { X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Button } from './button'

interface SelectOption {
  value: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
}

interface FormSelectProps {
  options: SelectOption[]
  value?: string
  onValueChange: (value: string | undefined) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  showClearButton?: boolean
  className?: string
  height?: string
  required?: boolean
  emptyOption?: { value: string; label: string }
}

export function FormSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select option",
  label,
  disabled = false,
  showClearButton = false,
  className = "",
  height = "h-9",
  required = false,
  emptyOption
}: FormSelectProps) {
  const allOptions = emptyOption ? [emptyOption, ...options] : options

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
          <SelectTrigger className={`${height} flex-1`}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {allOptions.map((option) => (
              <SelectItem 
                key={option.value} 
                value={option.value}
                disabled={(option as any).disabled || false}
              >
                <span className="flex items-center gap-2">
                  {(option as any).icon && (option as any).icon}
                  <span>{option.label}</span>
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