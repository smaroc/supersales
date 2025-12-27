'use server'

import { auth } from '@clerk/nextjs/server'
import { unstable_cache } from 'next/cache'
import connectToDatabase from '@/lib/mongodb'
import { CallAnalysis, User, COLLECTIONS } from '@/lib/types'
import { buildCallAnalysisFilter } from '@/lib/access-control'
import { getAuthorizedUser } from './users'

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

  console.log(`[HeadOfSales] Fetching reps data for user: ${currentUser.email} (${currentUser._id?.toString()})`)

  const startDate = resolveStartDate(timeRange)
  const now = new Date()

  // Get all sales reps in the organization
  const salesReps = await db.collection<User>(COLLECTIONS.USERS)
    .find({
      organizationId: currentUser.organizationId,
      role: { $in: ['sales_rep', 'manager'] },
      isActive: { $ne: false }
    })
    .project({ firstName: 1, lastName: 1, avatar: 1, clerkId: 1 })
    .toArray()

  // Build access filter based on user permissions
  const accessFilter = buildCallAnalysisFilter(currentUser)

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
  const sorted = salesRepsWithMetrics
    .filter(rep => rep.metrics.totalCalls > 0) // Only show reps with calls
    .sort((a, b) => b.performance.score - a.performance.score)

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

  // Cache for 2 minutes
  const getCachedReps = unstable_cache(
    async () => fetchHeadOfSalesRepsData(timeRange, userId),
    [`head-of-sales-reps-${timeRange}-${userId}`],
    {
      revalidate: 120,
      tags: ['head-of-sales-reps', `timerange-${timeRange}`]
    }
  )

  return await getCachedReps()
}

async function fetchHeadOfSalesTeamMetricsData(timeRange: TimeRange, _userId: string): Promise<TeamMetricsResponse> {
  const { db, currentUser } = await getAuthorizedUser()

  if (!currentUser) {
    throw new Error('User not found')
  }

  console.log(`[HeadOfSales] Fetching team metrics for user: ${currentUser.email} (${currentUser._id?.toString()})`)

  const startDate = resolveStartDate(timeRange)

  // Count total reps
  const totalReps = await db.collection<User>(COLLECTIONS.USERS).countDocuments({
    organizationId: currentUser.organizationId,
    role: { $in: ['sales_rep', 'manager'] },
    isActive: { $ne: false }
  })

  // Build access filter
  const accessFilter = buildCallAnalysisFilter(currentUser)

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
      role: { $in: ['sales_rep', 'manager'] },
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

  // Cache for 2 minutes
  const getCachedMetrics = unstable_cache(
    async () => fetchHeadOfSalesTeamMetricsData(timeRange, userId),
    [`head-of-sales-team-metrics-${timeRange}-${userId}`],
    {
      revalidate: 120,
      tags: ['head-of-sales-metrics', `timerange-${timeRange}`]
    }
  )

  return await getCachedMetrics()
}
