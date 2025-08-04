import React from 'react'

interface CircularProgressProps {
  percentage: number
  size?: number
  strokeWidth?: number
  status?: 'on_track' | 'warning' | 'over_budget' | 'unknown'
  className?: string
  showPercentage?: boolean
}

export function CircularProgress({
  percentage,
  size = 60,
  strokeWidth = 6,
  status = 'on_track',
  className = '',
  showPercentage = true
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference

  const getStrokeColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return '#10B981' // green-500
      case 'warning':
        return '#F59E0B' // yellow-500
      case 'over_budget':
        return '#EF4444' // red-500
      default:
        return '#6B7280' // gray-500
    }
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getStrokeColor(status)}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
      
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-700">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  )
}