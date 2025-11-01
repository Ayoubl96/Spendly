import React, { useState } from 'react'
import { AnalyticsRequest } from '../../types/api.types'
import { apiService } from '../../services/api.service'

interface ExportButtonsProps {
  analyticsParams: AnalyticsRequest
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ analyticsParams }) => {
  const [isExporting, setIsExporting] = useState(false)

  const handleExportCSV = async () => {
    try {
      setIsExporting(true)
      const blob = await apiService.exportExpenseAnalytics(analyticsParams, 'csv')
      const filename = `expense_analytics_${analyticsParams.start_date}_${analyticsParams.end_date}.csv`
      apiService.downloadExport(blob, filename)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export data. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExportCSV}
        disabled={isExporting}
        className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 ${
          isExporting ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        {isExporting ? 'Exporting...' : 'Export CSV'}
      </button>
    </div>
  )
}
