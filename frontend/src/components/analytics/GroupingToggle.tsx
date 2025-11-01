import React from 'react'
import { GroupByType } from '../../types/api.types'

interface GroupingToggleProps {
  selectedGrouping: GroupByType
  onGroupingChange: (grouping: GroupByType) => void
}

export const GroupingToggle: React.FC<GroupingToggleProps> = ({
  selectedGrouping,
  onGroupingChange
}) => {
  const options: { value: GroupByType; label: string; icon: string }[] = [
    { value: 'day', label: 'Day', icon: '📅' },
    { value: 'week', label: 'Week', icon: '📆' },
    { value: 'month', label: 'Month', icon: '🗓️' }
  ]

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onGroupingChange(option.value)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            selectedGrouping === option.value
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="mr-2">{option.icon}</span>
          {option.label}
        </button>
      ))}
    </div>
  )
}
