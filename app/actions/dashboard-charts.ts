'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { CallAnalysis, CallRecord, User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

export interface ChartDataPoint {
  date: string
  calls: number
  sales: number
}

/**
 * Get chart data for the dashboard
 * Returns aggregated data for calls per day and sales per day
 */
export async function getDashboardChartData(days: number = 30): Promise<ChartDataPoint[]> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return []
    }

    const { db } = await connectToDatabase()

    // Get current user
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return []
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Build filter based on user access level
    let filter: any = {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    }

    // Apply organization filter
    if (!currentUser.isSuperAdmin) {
      filter.organizationId = currentUser.organizationId
    }

    // If not admin, filter by user
    if (!currentUser.isAdmin && !currentUser.isSuperAdmin) {
      filter.userId = userId
    }

    // Fetch call analyses
    const analyses = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
      .find(filter)
      .sort({ createdAt: 1 })
      .toArray()

    // Create a map to store aggregated data by date
    const dataMap = new Map<string, { calls: number; sales: number }>()

    // Initialize all dates in the range with 0 values
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateKey = date.toISOString().split('T')[0]
      dataMap.set(dateKey, { calls: 0, sales: 0 })
    }

    // Aggregate data by date
    analyses.forEach(analysis => {
      const dateKey = new Date(analysis.createdAt).toISOString().split('T')[0]
      const existing = dataMap.get(dateKey) || { calls: 0, sales: 0 }

      existing.calls += 1
      if (analysis.venteEffectuee) {
        existing.sales += 1
      }

      dataMap.set(dateKey, existing)
    })

    // Convert map to array and format for chart
    const chartData: ChartDataPoint[] = Array.from(dataMap.entries())
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('fr-FR', {
          month: 'short',
          day: 'numeric'
        }),
        calls: data.calls,
        sales: data.sales
      }))
      .sort((a, b) => {
        const dateA = new Date(a.date)
        const dateB = new Date(b.date)
        return dateA.getTime() - dateB.getTime()
      })

    return chartData
  } catch (error) {
    console.error('Error fetching dashboard chart data:', error)
    return []
  }
}

/**
 * Get weekly summary data
 */
export async function getWeeklySummary() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { totalCalls: 0, totalSales: 0, conversionRate: 0 }
    }

    const { db } = await connectToDatabase()

    // Get current user
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return { totalCalls: 0, totalSales: 0, conversionRate: 0 }
    }

    // Calculate date range for the last 7 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)

    // Build filter based on user access level
    let filter: any = {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    }

    // Apply organization filter
    if (!currentUser.isSuperAdmin) {
      filter.organizationId = currentUser.organizationId
    }

    // If not admin, filter by user
    if (!currentUser.isAdmin && !currentUser.isSuperAdmin) {
      filter.userId = userId
    }

    // Fetch call analyses
    const analyses = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
      .find(filter)
      .toArray()

    const totalCalls = analyses.length
    const totalSales = analyses.filter(a => a.venteEffectuee).length
    const conversionRate = totalCalls > 0 ? (totalSales / totalCalls) * 100 : 0

    return {
      totalCalls,
      totalSales,
      conversionRate: Math.round(conversionRate * 10) / 10
    }
  } catch (error) {
    console.error('Error fetching weekly summary:', error)
    return { totalCalls: 0, totalSales: 0, conversionRate: 0 }
  }
}
