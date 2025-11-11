'use server'

import { getAuthorizedUser } from './users'
import { getDashboardMetrics, getRecentActivities } from './dashboard-metrics'
import { getRecentCallAnalyses, getTopObjections, getAverageLeadScore } from './call-analysis'
import { getTopPerformers } from './sales-reps'
import { getDashboardChartData, getWeeklySummary } from './dashboard-charts'

/**
 * Get all dashboard data in a single request
 * This consolidates all the data fetching for the main dashboard page
 * Respects impersonation for SuperAdmin users
 */
export async function getAllDashboardData() {
  try {
    // Get authorized user (respects impersonation)
    const { currentUser } = await getAuthorizedUser()

    if (!currentUser) {
      throw new Error('User not found')
    }

    const organizationId = currentUser.organizationId

    console.log(`[Dashboard] Fetching all data for user: ${currentUser.email}`)
    console.log(`[Dashboard] User ID: ${currentUser._id?.toString()}`)
    console.log(`[Dashboard] Organization ID: ${organizationId?.toString()}`)
    console.log(`[Dashboard] isAdmin: ${currentUser.isAdmin}, isSuperAdmin: ${currentUser.isSuperAdmin}`)

    // Convert organizationId to string for functions that need it
    const orgIdString = organizationId.toString()
    const userIdString = currentUser._id?.toString() || ''

    // Fetch all dashboard data in parallel
    const [
      metrics,
      recentCalls,
      topPerformers,
      recentActivities,
      chartData,
      weeklySummary,
      topObjections,
      averageLeadScore
    ] = await Promise.all([
      getDashboardMetrics(organizationId),
      getRecentCallAnalyses(userIdString, 3),
      getTopPerformers(orgIdString, 3),
      getRecentActivities(orgIdString, 3),
      getDashboardChartData(30),
      getWeeklySummary(),
      getTopObjections(orgIdString, 3),
      getAverageLeadScore(orgIdString),
    ])

    console.log(`Dashboard - Data fetched successfully`)
    console.log(`Dashboard - Metrics: ${JSON.stringify({ totalCalls: metrics.totalCalls, conversionRate: metrics.conversionRate })}`)

    return {
      metrics,
      recentCalls,
      topPerformers,
      recentActivities,
      chartData,
      weeklySummary,
      topObjections,
      averageLeadScore,
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    throw error
  }
}
