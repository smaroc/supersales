'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { CallAnalysis, CallRecord, User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'
import { buildCallAnalysisFilter } from '@/lib/access-control'
import { getTinybirdClient, isTinybirdReadsEnabled, isTinybirdConfigured } from '@/lib/tinybird'

export interface ChartDataPoint {
  date: string
  calls: number
  sales: number
}

/**
 * Get chart data from Tinybird
 */
async function getDashboardChartDataFromTinybird(currentUser: User, days: number): Promise<ChartDataPoint[]> {
  const tinybird = getTinybirdClient()
  const result = await tinybird.getDashboardChartData(currentUser, { days })

  // Create a map to fill in missing dates with 0 values
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const dataMap = new Map<string, { calls: number; sales: number }>()

  // Initialize all dates in the range with 0 values
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateKey = date.toISOString().split('T')[0]
    dataMap.set(dateKey, { calls: 0, sales: 0 })
  }

  // Fill in data from Tinybird
  result.data.forEach(row => {
    const dateKey = row.date
    dataMap.set(dateKey, { calls: row.calls, sales: row.sales })
  })

  // Convert map to array and format for chart
  return Array.from(dataMap.entries())
    .map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('fr-FR', {
        month: 'short',
        day: 'numeric'
      }),
      calls: data.calls,
      sales: data.sales
    }))
    .sort((a, b) => {
      // Parse French date format for proper sorting
      const parseDate = (str: string) => {
        const parts = str.split(' ')
        return new Date(`${parts[1]} ${parts[0]}, ${new Date().getFullYear()}`)
      }
      return parseDate(a.date).getTime() - parseDate(b.date).getTime()
    })
}

/**
 * Get chart data from MongoDB (fallback)
 */
async function getDashboardChartDataFromMongo(currentUser: User, days: number): Promise<ChartDataPoint[]> {
  const { db } = await connectToDatabase()

  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Build access filter based on user permissions
  const accessFilter = buildCallAnalysisFilter(currentUser)

  // Combine with date range filter
  const filter = {
    ...accessFilter,
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  }

  console.log(`Dashboard chart data filter applied: ${JSON.stringify(filter)}`)

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
  return Array.from(dataMap.entries())
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

    // Try Tinybird first if enabled
    if (isTinybirdReadsEnabled() && isTinybirdConfigured()) {
      try {
        console.log('[Tinybird] Fetching dashboard chart data from Tinybird')
        return await getDashboardChartDataFromTinybird(currentUser, days)
      } catch (error) {
        console.error('[Tinybird] Dashboard chart data query failed, falling back to MongoDB:', error)
      }
    }

    // Fallback to MongoDB
    return getDashboardChartDataFromMongo(currentUser, days)
  } catch (error) {
    console.error('Error fetching dashboard chart data:', error)
    return []
  }
}

/**
 * Get summary data from Tinybird for the specified period
 */
async function getSummaryFromTinybird(currentUser: User, days: number) {
  const tinybird = getTinybirdClient()

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const result = await tinybird.getDashboardMetrics(currentUser, {
    dateFrom: startDate.toISOString().split('T')[0],
    dateTo: endDate.toISOString().split('T')[0],
  })

  if (result.data.length === 0) {
    return { totalCalls: 0, totalSales: 0, conversionRate: 0, noShowCount: 0, showUpRate: 100 }
  }

  const metrics = result.data[0]
  const noShowCount = metrics.no_show_count || 0
  const totalCalls = metrics.total_calls
  const showUpRate = totalCalls > 0 ? ((totalCalls - noShowCount) / totalCalls) * 100 : 100

  return {
    totalCalls: metrics.total_calls,
    totalSales: metrics.closed_deals,
    conversionRate: Math.round(metrics.conversion_rate * 10) / 10,
    noShowCount,
    showUpRate: Math.round(showUpRate * 10) / 10
  }
}

/**
 * Get summary data from MongoDB (fallback) for the specified period
 */
async function getSummaryFromMongo(currentUser: User, days: number) {
  const { db } = await connectToDatabase()

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Build access filter based on user permissions
  const accessFilter = buildCallAnalysisFilter(currentUser)

  // Combine with date range filter
  const filter = {
    ...accessFilter,
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  }

  console.log(`Period summary (${days} days) filter applied: ${JSON.stringify(filter)}`)

  // Fetch call analyses
  const analyses = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
    .find(filter)
    .toArray()

  const totalCalls = analyses.length
  const totalSales = analyses.filter(a => a.venteEffectuee).length
  const noShowCount = analyses.filter(a => a.no_show).length
  const conversionRate = totalCalls > 0 ? (totalSales / totalCalls) * 100 : 0
  const showUpRate = totalCalls > 0 ? ((totalCalls - noShowCount) / totalCalls) * 100 : 100

  return {
    totalCalls,
    totalSales,
    conversionRate: Math.round(conversionRate * 10) / 10,
    noShowCount,
    showUpRate: Math.round(showUpRate * 10) / 10
  }
}

/**
 * Get summary data for the specified period
 * @param days - Number of days to calculate summary for (default: 30)
 */
export async function getWeeklySummary(days: number = 30) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { totalCalls: 0, totalSales: 0, conversionRate: 0, noShowCount: 0, showUpRate: 100 }
    }

    const { db } = await connectToDatabase()

    // Get current user
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return { totalCalls: 0, totalSales: 0, conversionRate: 0, noShowCount: 0, showUpRate: 100 }
    }

    // Try Tinybird first if enabled
    if (isTinybirdReadsEnabled() && isTinybirdConfigured()) {
      try {
        console.log(`[Tinybird] Fetching summary (${days} days) from Tinybird`)
        return await getSummaryFromTinybird(currentUser, days)
      } catch (error) {
        console.error('[Tinybird] Summary query failed, falling back to MongoDB:', error)
      }
    }

    // Fallback to MongoDB
    return getSummaryFromMongo(currentUser, days)
  } catch (error) {
    console.error('Error fetching weekly summary:', error)
    return { totalCalls: 0, totalSales: 0, conversionRate: 0, noShowCount: 0, showUpRate: 100 }
  }
}
