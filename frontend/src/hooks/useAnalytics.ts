import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { AnalyticsResponse, AnalyticsRequest } from '../types/api.types'
import { apiService } from '../services/api.service'

export function useAnalytics(
  params: AnalyticsRequest,
  enabled: boolean = true
): UseQueryResult<AnalyticsResponse, Error> {
  return useQuery({
    queryKey: ['analytics', params],
    queryFn: () => apiService.getExpenseAnalytics(params),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
