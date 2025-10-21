'use client'

import { useQuery } from '@tanstack/react-query'
import { getHeadOfSalesReps, getHeadOfSalesTeamMetrics } from '@/app/actions/head-of-sales'

type TimeRange = 'thisWeek' | 'thisMonth' | 'thisQuarter' | 'thisYear'

export function useHeadOfSalesData(timeRange: TimeRange) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['head-of-sales', timeRange],
    queryFn: async () => {
      const [repsData, metricsData] = await Promise.all([
        getHeadOfSalesReps(timeRange),
        getHeadOfSalesTeamMetrics(timeRange),
      ])

      return {
        salesReps: repsData,
        teamMetrics: metricsData,
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - sales data changes more frequently
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  })

  return {
    salesReps: data?.salesReps ?? [],
    teamMetrics: data?.teamMetrics ?? null,
    isLoading,
    error: error as Error | null,
  }
}
