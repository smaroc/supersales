'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { User, COLLECTIONS } from '@/lib/types'
import { getTinybirdClient, isTinybirdConfigured } from '@/lib/tinybird'

export interface ChartDataPoint {
  date: string
  calls: number
  sales: number
}

/**
 * Get chart data for the dashboard from Tinybird
 * Returns aggregated data for calls per day and sales per day
 */
export async function getDashboardChartData(days: number = 30): Promise<ChartDataPoint[]> {
  if (!isTinybirdConfigured()) {
    return []
  }

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
  } catch (error) {
    console.error('Error fetching dashboard chart data:', error)
    return []
  }
}

/**
 * Get summary data for the specified period from Tinybird
 * @param days - Number of days to calculate summary for (default: 30)
 */
export async function getWeeklySummary(days: number = 30) {
  if (!isTinybirdConfigured()) {
    return { totalCalls: 0, totalSales: 0, conversionRate: 0, noShowCount: 0, showUpRate: 100 }
  }

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
  } catch (error) {
    console.error('Error fetching weekly summary:', error)
    return { totalCalls: 0, totalSales: 0, conversionRate: 0, noShowCount: 0, showUpRate: 100 }
  }
}
