import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  className,
  disabled = false,
}: DatePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)

  React.useEffect(() => {
    setSelectedDate(date)
  }, [date])

  const handleDateSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate)
    onDateChange?.(newDate)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedDate(undefined)
    onDateChange?.(undefined)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            <span className="flex-1">{format(selectedDate, "PPP")}</span>
          ) : (
            <span className="flex-1">{placeholder}</span>
          )}
          {selectedDate && (
            <X
              className="ml-2 h-4 w-4 opacity-50 hover:opacity-100 cursor-pointer"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

interface DateRangePickerProps {
  startDate?: Date
  endDate?: Date
  onStartDateChange?: (date: Date | undefined) => void
  onEndDateChange?: (date: Date | undefined) => void
  startPlaceholder?: string
  endPlaceholder?: string
  className?: string
  disabled?: boolean
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startPlaceholder = "Start date",
  endPlaceholder = "End date",
  className,
  disabled = false,
}: DateRangePickerProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      <DatePicker
        date={startDate}
        onDateChange={onStartDateChange}
        placeholder={startPlaceholder}
        disabled={disabled}
        className="flex-1"
      />
      <DatePicker
        date={endDate}
        onDateChange={onEndDateChange}
        placeholder={endPlaceholder}
        disabled={disabled}
        className="flex-1"
      />
    </div>
  )
}