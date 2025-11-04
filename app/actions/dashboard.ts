'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { User, COLLECTIONS } from '@/lib/types'
import { getDashboardMetrics, getRecentActivities } from './dashboard-metrics'
import { getRecentCallAnalyses, getTopObjections, getAverageLeadScore } from './call-analysis'
import { getTopPerformers } from './sales-reps'
import { getDashboardChartData, getWeeklySummary } from './dashboard-charts'

/**
 * Get all dashboard data in a single request
 * This consolidates all the data fetching for the main dashboard page
 */
export async function getAllDashboardData() {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { db } = await connectToDatabase()

    // Get current user
    const currentUser = await db.collection<User>(COLLECTIONS.USERS)
      .findOne({ clerkId: userId })

    if (!currentUser) {
      throw new Error('User not found')
    }

    const organizationId = currentUser.organizationId

    console.log(`Dashboard - Fetching all data for user: ${currentUser.email}`)
    console.log(`Dashboard - isAdmin: ${currentUser.isAdmin}, isSuperAdmin: ${currentUser.isSuperAdmin}`)

    // Convert organizationId to string for functions that need it
    const orgIdString = organizationId.toString()

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
      getRecentCallAnalyses(userId, 3),
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
