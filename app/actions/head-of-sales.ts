'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { CallAnalysis, User, COLLECTIONS } from '@/lib/types'
import { getAuthorizedUser } from './users'
import { ObjectId } from 'mongodb'
import { getTinybirdClient, isTinybirdConfigured } from '@/lib/tinybird'

type TimeRange = 'thisWeek' | 'thisMonth' | 'thisQuarter' | 'thisYear'

interface SalesRepMetricsResponse {
  id: string
  firstName?: string
  lastName?: string
  avatar?: string
  metrics: {
    totalCalls: number
    totalPitches: number
    totalSales: number
    noShowCount: number
    showUpRate: number
    closingRate: number
    averageScore: number
    thisMonthCalls: number
    thisMonthClosings: number
  }
  performance: {
    trend: 'up' | 'down' | 'stable'
    score: number
    rank: number
  }
}

interface TeamMetricsResponse {
  totalReps: number
  totalCalls: number
  totalPitches: number
  totalSales: number
  averageClosingRate: number
  noShowCount: number
  showUpRate: number
  topPerformer: string
  callTypes: {
    sales: { count: number; closingRate: number }
    discovery: { count: number }
    demo: { count: number }
    'follow-up': { count: number }
  }
}

function resolveStartDate(timeRange: TimeRange): Date {
  const now = new Date()

  switch (timeRange) {
    case 'thisWeek':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    case 'thisQuarter': {
      const quarter = Math.floor(now.getMonth() / 3)
      return new Date(now.getFullYear(), quarter * 3, 1)
    }
    case 'thisYear':
      return new Date(now.getFullYear(), 0, 1)
    case 'thisMonth':
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1)
  }
}

/**
 * Get sales reps data from Tinybird
 */
async function fetchHeadOfSalesRepsFromTinybird(
  currentUser: User,
  timeRange: TimeRange
): Promise<SalesRepMetricsResponse[]> {
  const tinybird = getTinybirdClient()
  const startDate = resolveStartDate(timeRange)

  // Get sales rep performance from Tinybird
  const result = await tinybird.getSalesRepPerformance(currentUser, {
    typeOfCall: 'sales',
    dateFrom: startDate.toISOString().split('T')[0],
    limit: 100
  })

  // Also need user info for avatar - get from MongoDB
  const { db } = await connectToDatabase()
  const salesReps = await db.collection<User>(COLLECTIONS.USERS)
    .find({
      organizationId: currentUser.organizationId,
      role: { $in: ['sales_rep', 'manager', 'head_of_sales'] },
      isActive: { $ne: false }
    })
    .project({ _id: 1, firstName: 1, lastName: 1, avatar: 1 })
    .toArray()

  const userMap = new Map(salesReps.map(u => [u._id?.toString(), u]))

  // Transform Tinybird data to match interface
  const repsData: SalesRepMetricsResponse[] = result.data.map((row, index) => {
    const user = userMap.get(row.sales_rep_id)
    const totalCalls = row.total_calls
    const noShowCount = row.no_show_count || 0
    const showUpRate = totalCalls > 0 ? ((totalCalls - noShowCount) / totalCalls) * 100 : 100

    return {
      id: row.sales_rep_id,
      firstName: user?.firstName,
      lastName: user?.lastName,
      avatar: user?.avatar,
      metrics: {
        totalCalls: row.total_calls,
        totalPitches: row.pitch_count || 0,
        totalSales: row.deals_won,
        noShowCount,
        showUpRate: Math.round(showUpRate * 10) / 10,
        closingRate: Math.round((row.win_rate || 0) * 10) / 10,
        averageScore: Math.round(row.avg_score || 0),
        thisMonthCalls: row.total_calls,
        thisMonthClosings: row.deals_won
      },
      performance: {
        trend: 'stable' as const, // Would need historical data for trend
        score: Math.round(row.avg_score || 0),
        rank: index + 1
      }
    }
  })

  // Add reps with no data
  for (const rep of salesReps) {
    const repId = rep._id?.toString() || ''
    if (!repsData.find(r => r.id === repId)) {
      repsData.push({
        id: repId,
        firstName: rep.firstName,
        lastName: rep.lastName,
        avatar: rep.avatar,
        metrics: {
          totalCalls: 0,
          totalPitches: 0,
          totalSales: 0,
          noShowCount: 0,
          showUpRate: 100,
          closingRate: 0,
          averageScore: 0,
          thisMonthCalls: 0,
          thisMonthClosings: 0
        },
        performance: {
          trend: 'stable',
          score: 0,
          rank: repsData.length + 1
        }
      })
    }
  }

  // Sort by score and assign ranks
  repsData.sort((a, b) => {
    if (a.metrics.totalCalls > 0 && b.metrics.totalCalls === 0) return -1
    if (a.metrics.totalCalls === 0 && b.metrics.totalCalls > 0) return 1
    return b.performance.score - a.performance.score
  })
  repsData.forEach((rep, index) => {
    rep.performance.rank = index + 1
  })

  return repsData
}

/**
 * Get team metrics from Tinybird
 */
async function fetchTeamMetricsFromTinybird(
  currentUser: User,
  timeRange: TimeRange
): Promise<TeamMetricsResponse> {
  const tinybird = getTinybirdClient()
  const startDate = resolveStartDate(timeRange)
  const dateFrom = startDate.toISOString().split('T')[0]

  // Get overall metrics
  const metricsResult = await tinybird.getDashboardMetrics(currentUser, {
    typeOfCall: 'sales',
    dateFrom
  })

  // Count reps from MongoDB (Tinybird doesn't have user count)
  const { db } = await connectToDatabase()
  const totalReps = await db.collection<User>(COLLECTIONS.USERS).countDocuments({
    organizationId: currentUser.organizationId,
    role: { $in: ['sales_rep', 'manager', 'head_of_sales'] },
    isActive: { $ne: false }
  })

  // Get top performer
  const perfResult = await tinybird.getSalesRepPerformance(currentUser, {
    typeOfCall: 'sales',
    dateFrom,
    limit: 1
  })

  const metrics = metricsResult.data[0] || {
    total_calls: 0,
    closed_deals: 0,
    conversion_rate: 0,
    no_show_count: 0,
    pitch_count: 0
  }

  const totalCalls = metrics.total_calls
  const noShowCount = metrics.no_show_count || 0
  const showUpRate = totalCalls > 0 ? ((totalCalls - noShowCount) / totalCalls) * 100 : 100
  const topPerformer = perfResult.data[0]?.sales_rep_name || 'N/A'

  return {
    totalReps,
    totalCalls: metrics.total_calls,
    totalPitches: metrics.pitch_count || 0,
    totalSales: metrics.closed_deals,
    averageClosingRate: Math.round((metrics.conversion_rate || 0) * 10) / 10,
    noShowCount,
    showUpRate: Math.round(showUpRate * 10) / 10,
    topPerformer,
    callTypes: {
      sales: { count: metrics.total_calls, closingRate: Math.round((metrics.conversion_rate || 0) * 10) / 10 },
      discovery: { count: 0 }, // Would need separate query
      demo: { count: 0 },
      'follow-up': { count: 0 }
    }
  }
}

export async function getHeadOfSalesReps(timeRange: TimeRange = 'thisMonth'): Promise<SalesRepMetricsResponse[]> {
  if (!isTinybirdConfigured()) {
    console.warn('[HeadOfSales] Tinybird not configured, returning empty data')
    return []
  }

  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  // Get current user for Tinybird access check
  const { currentUser } = await getAuthorizedUser()
  if (!currentUser) {
    throw new Error('User not found')
  }

  // Check access
  const hasAccess = currentUser.role === 'head_of_sales' ||
    currentUser.role === 'manager' ||
    currentUser.role === 'admin' ||
    currentUser.isAdmin ||
    currentUser.isSuperAdmin

  if (!hasAccess) {
    throw new Error('Access denied: Head of Sales access required')
  }

  return await fetchHeadOfSalesRepsFromTinybird(currentUser, timeRange)
}

export async function getHeadOfSalesTeamMetrics(timeRange: TimeRange = 'thisMonth'): Promise<TeamMetricsResponse> {
  if (!isTinybirdConfigured()) {
    console.warn('[HeadOfSales] Tinybird not configured, returning empty metrics')
    return {
      totalReps: 0,
      totalCalls: 0,
      totalPitches: 0,
      totalSales: 0,
      averageClosingRate: 0,
      noShowCount: 0,
      showUpRate: 100,
      topPerformer: 'N/A',
      callTypes: {
        sales: { count: 0, closingRate: 0 },
        discovery: { count: 0 },
        demo: { count: 0 },
        'follow-up': { count: 0 }
      }
    }
  }

  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  // Get current user for Tinybird access check
  const { currentUser } = await getAuthorizedUser()
  if (!currentUser) {
    throw new Error('User not found')
  }

  // Check access
  const hasAccess = currentUser.role === 'head_of_sales' ||
    currentUser.role === 'manager' ||
    currentUser.role === 'admin' ||
    currentUser.isAdmin ||
    currentUser.isSuperAdmin

  if (!hasAccess) {
    throw new Error('Access denied: Head of Sales access required')
  }

  return await fetchTeamMetricsFromTinybird(currentUser, timeRange)
}

// Individual Sales Rep Profile
export interface SalesRepProfileResponse {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  avatar?: string
  metrics: {
    totalCalls: number
    conversionRate: number
    noShowCount: number
    averageScore: number
    averageDuration: number // in minutes
    totalPitches: number
    totalSales: number
    showUpRate: number
  }
  objections: {
    total: number
    mastered: number
    notMastered: number
    masteringRate: number
    details: Array<{
      type: string
      count: number
      resolved: number
    }>
  }
  recentCalls: Array<{
    id: string
    title: string
    date: string
    duration: number
    score: number
    outcome: string
  }>
  monthlyTrend: Array<{
    month: string
    calls: number
    sales: number
    conversionRate: number
  }>
}

export async function getSalesRepProfile(repId: string, timeRange: TimeRange = 'thisMonth'): Promise<SalesRepProfileResponse | null> {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const { db, currentUser } = await getAuthorizedUser()

  if (!currentUser) {
    throw new Error('User not found')
  }

  // Check if user has head of sales access (head_of_sales or manager)
  const hasAccess = currentUser.role === 'head_of_sales' ||
    currentUser.role === 'manager' ||
    currentUser.role === 'admin' ||
    currentUser.isAdmin ||
    currentUser.isSuperAdmin

  if (!hasAccess) {
    throw new Error('Access denied')
  }

  // Get the sales rep user
  const salesRep = await db.collection<User>(COLLECTIONS.USERS).findOne({
    _id: new ObjectId(repId),
    organizationId: currentUser.isSuperAdmin ? { $exists: true } : currentUser.organizationId
  })

  if (!salesRep) {
    return null
  }

  const startDate = resolveStartDate(timeRange)
  const repIdStr = salesRep._id?.toString() || ''
  const repClerkId = salesRep.clerkId || ''

  // Get all call analyses for this rep
  const callAnalyses = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
    .find({
      organizationId: currentUser.isSuperAdmin ? { $exists: true } : currentUser.organizationId,
      createdAt: { $gte: startDate },
      $or: [
        { salesRepId: repIdStr },
        { userId: repClerkId }
      ]
    })
    .sort({ createdAt: -1 })
    .toArray()

  // Calculate metrics
  const totalCalls = callAnalyses.length
  const noShowCount = callAnalyses.filter(c => c.no_show === true).length
  const totalPitches = callAnalyses.filter(c => c.pitch_effectue === true).length
  const totalSales = callAnalyses.filter(c => c.venteEffectuee === true).length
  const showUpRate = totalCalls > 0 ? ((totalCalls - noShowCount) / totalCalls) * 100 : 100
  const conversionRate = totalCalls > 0 ? (totalSales / totalCalls) * 100 : 0

  // Calculate average score
  const scoresSum = callAnalyses.reduce((sum, call) => sum + (call.noteGlobale?.total || 0), 0)
  const averageScore = totalCalls > 0 ? scoresSum / totalCalls : 0

  // Calculate average duration (dureeAppel is a string like "45 min")
  const durationsSum = callAnalyses.reduce((sum, call) => {
    const durationStr = call.dureeAppel || '0'
    const durationNum = parseFloat(durationStr.replace(/[^0-9.]/g, '')) || 0
    return sum + durationNum
  }, 0)
  const averageDuration = totalCalls > 0 ? durationsSum / totalCalls : 0

  // Calculate objections metrics
  let totalObjections = 0
  let masteredObjections = 0
  const objectionsByType: Record<string, { count: number; resolved: number }> = {}

  callAnalyses.forEach((analysis: any) => {
    if (analysis.objections_lead && Array.isArray(analysis.objections_lead)) {
      analysis.objections_lead.forEach((obj: any) => {
        totalObjections++
        const type = obj.type || 'Autre'
        if (!objectionsByType[type]) {
          objectionsByType[type] = { count: 0, resolved: 0 }
        }
        objectionsByType[type].count++
        if (obj.resolue === true) {
          masteredObjections++
          objectionsByType[type].resolved++
        }
      })
    }
  })

  const notMasteredObjections = totalObjections - masteredObjections
  const masteringRate = totalObjections > 0 ? (masteredObjections / totalObjections) * 100 : 0

  // Recent calls (last 10)
  const recentCalls = callAnalyses.slice(0, 10).map(call => {
    const durationStr = call.dureeAppel || '0'
    const durationNum = parseFloat(durationStr.replace(/[^0-9.]/g, '')) || 0
    return {
      id: call._id?.toString() || '',
      title: (call as any).titre || 'Appel sans titre',
      date: call.createdAt?.toISOString() || new Date().toISOString(),
      duration: durationNum,
      score: call.noteGlobale?.total || 0,
      outcome: call.venteEffectuee ? 'Vente' : call.no_show ? 'No-show' : call.pitch_effectue ? 'Pitch' : 'Autre'
    }
  })

  // Monthly trend (last 6 months)
  const monthlyTrend: Array<{ month: string; calls: number; sales: number; conversionRate: number }> = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

    const monthCalls = callAnalyses.filter(c => {
      const date = new Date(c.createdAt || 0)
      return date >= monthStart && date <= monthEnd
    })
    const monthSales = monthCalls.filter(c => c.venteEffectuee === true).length

    monthlyTrend.push({
      month: `${monthNames[monthStart.getMonth()]} ${monthStart.getFullYear()}`,
      calls: monthCalls.length,
      sales: monthSales,
      conversionRate: monthCalls.length > 0 ? (monthSales / monthCalls.length) * 100 : 0
    })
  }

  const profile: SalesRepProfileResponse = {
    id: repIdStr,
    firstName: salesRep.firstName || '',
    lastName: salesRep.lastName || '',
    email: salesRep.email || '',
    role: salesRep.role || 'sales_rep',
    avatar: salesRep.avatar,
    metrics: {
      totalCalls,
      conversionRate: Math.round(conversionRate * 10) / 10,
      noShowCount,
      averageScore: Math.round(averageScore),
      averageDuration: Math.round(averageDuration * 10) / 10,
      totalPitches,
      totalSales,
      showUpRate: Math.round(showUpRate * 10) / 10
    },
    objections: {
      total: totalObjections,
      mastered: masteredObjections,
      notMastered: notMasteredObjections,
      masteringRate: Math.round(masteringRate * 10) / 10,
      details: Object.entries(objectionsByType).map(([type, data]) => ({
        type,
        count: data.count,
        resolved: data.resolved
      }))
    },
    recentCalls,
    monthlyTrend
  }

  return JSON.parse(JSON.stringify(profile))
}
