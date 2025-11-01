import React, { useState } from 'react'
import { TimeRangePreset } from '../../types/api.types'
import { getTimeRange, formatDateForAPI } from '../../utils/timeRangeUtils'

interface TimeRangeSelectorProps {
  selectedPreset: TimeRangePreset
  customStartDate?: Date
  customEndDate?: Date
  onRangeChange: (preset: TimeRangePreset, startDate: Date, endDate: Date) => void
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  selectedPreset,
  customStartDate,
  customEndDate,
  onRangeChange
}) => {
  const [showCustomPicker, setShowCustomPicker] = useState(selectedPreset === 'custom')
  const [customStart, setCustomStart] = useState(customStartDate || new Date())
  const [customEnd, setCustomEnd] = useState(customEndDate || new Date())

  const presetOptions: { value: TimeRangePreset; label: string }[] = [
    { value: 'last_7_days', label: 'Last 7 days' },
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'last_90_days', label: 'Last 90 days' },
    { value: 'this_month', label: 'This month' },
    { value: 'this_year', label: 'This year' },
    { value: 'last_year', label: 'Last year' },
    { value: 'custom', label: 'Custom range' }
  ]

  const handlePresetChange = (preset: TimeRangePreset) => {
    if (preset === 'custom') {
      setShowCustomPicker(true)
      onRangeChange(preset, customStart, customEnd)
    } else {
      setShowCustomPicker(false)
      const range = getTimeRange(preset)
      onRangeChange(preset, range.start_date, range.end_date)
    }
  }

  const handleCustomDateChange = () => {
    if (customEnd < customStart) {
      alert('End date must be after start date')
      return
    }
    onRangeChange('custom', customStart, customEnd)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {presetOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handlePresetChange(option.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPreset === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {showCustomPicker && (
        <div className="flex items-end gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={formatDateForAPI(customStart)}
              onChange={(e) => setCustomStart(new Date(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={formatDateForAPI(customEnd)}
              onChange={(e) => setCustomEnd(new Date(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleCustomDateChange}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
