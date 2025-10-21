'use client'

import { useQuery } from '@tanstack/react-query'
import { useUser } from '@clerk/nextjs'
import { getDashboardMetrics, getRecentActivities } from '@/app/actions/dashboard-metrics'
import { getRecentCallAnalyses } from '@/app/actions/call-analysis'
import { getTopPerformers } from '@/app/actions/sales-reps'
import { getDashboardChartData, getWeeklySummary } from '@/app/actions/dashboard-charts'

export function useDashboardData() {
  const { user, isLoaded } = useUser()

  // First fetch user data
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')
      const response = await fetch(`/api/users/by-clerk-id/${user.id}`)
      if (!response.ok) throw new Error('Failed to fetch user data')
      return response.json()
    },
    enabled: isLoaded && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - user data doesn't change often
  })

  // Then fetch dashboard data using the organizationId
  const { data: dashboardData, isLoading: dashboardLoading, error } = useQuery({
    queryKey: ['dashboard', userData?.organizationId],
    queryFn: async () => {
      if (!userData?.organizationId) throw new Error('No organization ID')

      const [metrics, recentCalls, topPerformers, recentActivities, chartData, weeklySummary] =
        await Promise.all([
          getDashboardMetrics(userData.organizationId),
          getRecentCallAnalyses(userData.organizationId, 3),
          getTopPerformers(userData.organizationId, 3),
          getRecentActivities(userData.organizationId, 3),
          getDashboardChartData(30),
          getWeeklySummary(),
        ])

      return {
        metrics,
        recentCalls,
        topPerformers,
        recentActivities,
        chartData,
        weeklySummary,
      }
    },
    enabled: !!userData?.organizationId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes instead of 30 seconds
  })

  return {
    data: dashboardData,
    isLoading: userLoading || dashboardLoading,
    error: error as Error | null,
  }
}
