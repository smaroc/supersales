'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { CallAnalysis, User, COLLECTIONS } from '@/lib/types'
import { getAuthorizedUser } from './users'
import { ObjectId } from 'mongodb'

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

async function fetchHeadOfSalesRepsData(timeRange: TimeRange, _userId: string): Promise<SalesRepMetricsResponse[]> {
  const { db, currentUser } = await getAuthorizedUser()

  if (!currentUser) {
    throw new Error('User not found')
  }

  // Check if user has head of sales access (head_of_sales, manager, admin, or superadmin)
  const hasHeadOfSalesAccess = currentUser.role === 'head_of_sales' ||
    currentUser.role === 'manager' ||
    currentUser.role === 'admin' ||
    currentUser.isAdmin ||
    currentUser.isSuperAdmin

  if (!hasHeadOfSalesAccess) {
    throw new Error('Access denied: Head of Sales access required')
  }

  console.log(`[HeadOfSales] Fetching reps data for user: ${currentUser.email} (${currentUser._id?.toString()})`)

  const startDate = resolveStartDate(timeRange)
  const now = new Date()

  // Get all sales reps in the organization (include head_of_sales who also make calls)
  const salesReps = await db.collection<User>(COLLECTIONS.USERS)
    .find({
      organizationId: currentUser.organizationId,
      role: { $in: ['sales_rep', 'manager', 'head_of_sales'] },
      isActive: { $ne: false }
    })
    .project({ firstName: 1, lastName: 1, avatar: 1, clerkId: 1 })
    .toArray()

  // Head of sales needs to see ALL data in their organization, not just their own
  // Build filter that shows organization-wide data (like an admin)
  const accessFilter: Record<string, any> = currentUser.isSuperAdmin
    ? { typeOfCall: 'sales' }
    : { organizationId: currentUser.organizationId, typeOfCall: 'sales' }

  // Get all call analyses for the period
  const callAnalyses = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
    .find({
      ...accessFilter,
      createdAt: { $gte: startDate }
    })
    .toArray()

  console.log(`[HeadOfSales] Found ${callAnalyses.length} call analyses for period starting ${startDate.toISOString()}`)

  const salesRepsWithMetrics = await Promise.all(
    salesReps.map(async (rep) => {
      const repId = rep._id?.toString() || ''
      const repClerkId = rep.clerkId || ''

      // Filter calls for this rep (by salesRepId or userId which contains clerkId)
      const repCalls = callAnalyses.filter(call =>
        call.salesRepId === repId || call.userId === repClerkId
      )

      const totalCalls = repCalls.length
      const totalPitches = repCalls.filter(call => call.pitch_effectue === true).length
      const totalSales = repCalls.filter(call => call.venteEffectuee === true).length
      const noShowCount = repCalls.filter(call => call.no_show === true).length
      const showUpRate = totalCalls > 0 ? ((totalCalls - noShowCount) / totalCalls) * 100 : 100
      const closingRate = totalCalls > 0 ? (totalSales / totalCalls) * 100 : 0

      // Calculate average score
      const scoresSum = repCalls.reduce((sum, call) => sum + (call.noteGlobale?.total || 0), 0)
      const averageScore = totalCalls > 0 ? scoresSum / totalCalls : 0

      // Get previous period data for trend calculation
      const prevPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()))
      const prevCalls = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
        .find({
          ...accessFilter,
          $or: [
            { salesRepId: repId },
            { userId: repClerkId }
          ],
          createdAt: { $gte: prevPeriodStart, $lt: startDate }
        })
        .toArray()

      const prevAvgScore = prevCalls.length > 0
        ? prevCalls.reduce((sum, call) => sum + (call.noteGlobale?.total || 0), 0) / prevCalls.length
        : 0

      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (averageScore > prevAvgScore * 1.05) {
        trend = 'up'
      } else if (averageScore < prevAvgScore * 0.95) {
        trend = 'down'
      }

      return {
        id: repId,
        firstName: rep.firstName,
        lastName: rep.lastName,
        avatar: rep.avatar,
        metrics: {
          totalCalls,
          totalPitches,
          totalSales,
          noShowCount,
          showUpRate: Math.round(showUpRate * 10) / 10,
          closingRate: Math.round(closingRate * 10) / 10,
          averageScore: Math.round(averageScore),
          thisMonthCalls: totalCalls,
          thisMonthClosings: totalSales
        },
        performance: {
          trend,
          score: Math.round(averageScore),
          rank: 0
        }
      }
    })
  )

  // Sort by performance score and assign ranks
  // Show all reps, those with calls first, then those without
  const sorted = salesRepsWithMetrics
    .sort((a, b) => {
      // Reps with calls come first
      if (a.metrics.totalCalls > 0 && b.metrics.totalCalls === 0) return -1
      if (a.metrics.totalCalls === 0 && b.metrics.totalCalls > 0) return 1
      // Then sort by score
      return b.performance.score - a.performance.score
    })

  sorted.forEach((rep, index) => {
    rep.performance.rank = index + 1
  })

  return JSON.parse(JSON.stringify(sorted))
}

export async function getHeadOfSalesReps(timeRange: TimeRange = 'thisMonth'): Promise<SalesRepMetricsResponse[]> {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  return await fetchHeadOfSalesRepsData(timeRange, userId)
}

async function fetchHeadOfSalesTeamMetricsData(timeRange: TimeRange, _userId: string): Promise<TeamMetricsResponse> {
  const { db, currentUser } = await getAuthorizedUser()

  if (!currentUser) {
    throw new Error('User not found')
  }

  // Check if user has head of sales access (head_of_sales, manager, admin, or superadmin)
  const hasHeadOfSalesAccess = currentUser.role === 'head_of_sales' ||
    currentUser.role === 'manager' ||
    currentUser.role === 'admin' ||
    currentUser.isAdmin ||
    currentUser.isSuperAdmin

  if (!hasHeadOfSalesAccess) {
    throw new Error('Access denied: Head of Sales access required')
  }

  console.log(`[HeadOfSales] Fetching team metrics for user: ${currentUser.email} (${currentUser._id?.toString()})`)

  const startDate = resolveStartDate(timeRange)

  // Count total reps (include head_of_sales)
  const totalReps = await db.collection<User>(COLLECTIONS.USERS).countDocuments({
    organizationId: currentUser.organizationId,
    role: { $in: ['sales_rep', 'manager', 'head_of_sales'] },
    isActive: { $ne: false }
  })

  // Head of sales needs to see ALL data in their organization
  const accessFilter: Record<string, any> = currentUser.isSuperAdmin
    ? { typeOfCall: 'sales' }
    : { organizationId: currentUser.organizationId, typeOfCall: 'sales' }

  // Get all call analyses for the period
  const callAnalyses = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
    .find({
      ...accessFilter,
      createdAt: { $gte: startDate }
    })
    .toArray()

  const totalCalls = callAnalyses.length
  const totalPitches = callAnalyses.filter(call => call.pitch_effectue === true).length
  const totalSales = callAnalyses.filter(call => call.venteEffectuee === true).length
  const noShowCount = callAnalyses.filter(call => call.no_show === true).length
  const showUpRate = totalCalls > 0 ? ((totalCalls - noShowCount) / totalCalls) * 100 : 100
  const averageClosingRate = totalCalls > 0 ? (totalSales / totalCalls) * 100 : 0

  // Count by call type
  const salesCalls = callAnalyses.filter(call => call.typeOfCall === 'sales')
  const discoveryCalls = callAnalyses.filter(call => call.typeOfCall === 'discovery')
  const demoCalls = callAnalyses.filter(call => call.typeOfCall === 'demo')
  const followUpCalls = callAnalyses.filter(call => call.typeOfCall === 'follow-up')

  const salesClosings = salesCalls.filter(call => call.venteEffectuee === true).length
  const salesClosingRate = salesCalls.length > 0 ? (salesClosings / salesCalls.length) * 100 : 0

  // Find top performer
  const salesReps = await db.collection<User>(COLLECTIONS.USERS)
    .find({
      organizationId: currentUser.organizationId,
      role: { $in: ['sales_rep', 'manager', 'head_of_sales'] },
      isActive: { $ne: false }
    })
    .project({ firstName: 1, lastName: 1, clerkId: 1 })
    .toArray()

  let topPerformer = 'N/A'
  let bestScore = 0

  for (const rep of salesReps) {
    const repId = rep._id?.toString() || ''
    const repClerkId = rep.clerkId || ''
    const repCalls = callAnalyses.filter(call =>
      call.salesRepId === repId || call.userId === repClerkId
    )

    if (repCalls.length > 0) {
      const avgScore = repCalls.reduce((sum, call) => sum + (call.noteGlobale?.total || 0), 0) / repCalls.length
      if (avgScore > bestScore) {
        bestScore = avgScore
        topPerformer = `${rep.firstName || ''} ${rep.lastName || ''}`.trim() || 'N/A'
      }
    }
  }

  const teamMetrics: TeamMetricsResponse = {
    totalReps,
    totalCalls,
    totalPitches,
    totalSales,
    averageClosingRate: Math.round(averageClosingRate * 10) / 10,
    noShowCount,
    showUpRate: Math.round(showUpRate * 10) / 10,
    topPerformer,
    callTypes: {
      sales: {
        count: salesCalls.length,
        closingRate: Math.round(salesClosingRate * 10) / 10
      },
      discovery: {
        count: discoveryCalls.length
      },
      demo: {
        count: demoCalls.length
      },
      'follow-up': {
        count: followUpCalls.length
      }
    }
  }

  return JSON.parse(JSON.stringify(teamMetrics))
}

export async function getHeadOfSalesTeamMetrics(timeRange: TimeRange = 'thisMonth'): Promise<TeamMetricsResponse> {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  return await fetchHeadOfSalesTeamMetricsData(timeRange, userId)
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
