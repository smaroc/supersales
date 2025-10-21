'use server'

import { auth } from '@clerk/nextjs/server'
import { unstable_cache } from 'next/cache'
import connectToDatabase from '@/lib/mongodb'
import { CallEvaluation, User, COLLECTIONS } from '@/lib/types'

const ALLOWED_ROLES = ['head_of_sales', 'admin', 'manager'] as const

type AllowedRole = (typeof ALLOWED_ROLES)[number]

type TimeRange = 'thisWeek' | 'thisMonth' | 'thisQuarter' | 'thisYear'

interface SalesRepMetricsResponse {
  id: string
  firstName?: string
  lastName?: string
  avatar?: string
  metrics: {
    totalCalls: number
    totalPitches: number
    r1Calls: number
    r2Calls: number
    r3Calls: number
    r1ClosingRate: number
    r2ClosingRate: number
    overallClosingRate: number
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
  averageClosingRate: number
  topPerformer: string
  callTypes: {
    R1: { count: number; closingRate: number }
    R2: { count: number; closingRate: number }
    R3: { count: number; closingRate: number }
  }
}

async function getAuthorizedUser() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const { db } = await connectToDatabase()
  const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })

  if (!currentUser) {
    throw new Error('User not found')
  }

  if (!ALLOWED_ROLES.includes(currentUser.role as AllowedRole)) {
    throw new Error('Insufficient permissions')
  }

  return { db, currentUser }
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

async function fetchHeadOfSalesRepsData(timeRange: TimeRange, userId: string): Promise<SalesRepMetricsResponse[]> {
  const { db } = await connectToDatabase()
  const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })

  if (!currentUser) {
    throw new Error('User not found')
  }

  const startDate = resolveStartDate(timeRange)
  const now = new Date()

  const salesReps = await db.collection<User>(COLLECTIONS.USERS)
    .find({
      organizationId: currentUser.organizationId,
      role: { $in: ['sales_rep', 'manager'] },
      isActive: true
    })
    .project({ firstName: 1, lastName: 1, avatar: 1 })
    .toArray()

  const callEvaluations = await db.collection<CallEvaluation>(COLLECTIONS.CALL_EVALUATIONS)
    .find({
      organizationId: currentUser.organizationId,
      evaluationDate: { $gte: startDate }
    })
    .toArray()

  const salesRepsWithMetrics = await Promise.all(
    salesReps.map(async (rep) => {
      const repId = rep._id?.toString() || ''
      const repCalls = callEvaluations.filter(call => call.salesRepId === repId)

      const totalCalls = repCalls.length
      const totalPitches = repCalls.filter(call => call.callType !== 'PROSPECT').length

      const r1Calls = repCalls.filter(call => call.callType === 'R1')
      const r2Calls = repCalls.filter(call => call.callType === 'R2')
      const r3Calls = repCalls.filter(call => call.callType === 'R3')

      const r1Closings = r1Calls.filter(call => call.outcome === 'closed_won').length
      const r2Closings = r2Calls.filter(call => call.outcome === 'closed_won').length

      const r1ClosingRate = r1Calls.length > 0 ? (r1Closings / r1Calls.length) * 100 : 0
      const r2ClosingRate = r2Calls.length > 0 ? (r2Closings / r2Calls.length) * 100 : 0

      const totalClosings = repCalls.filter(call => call.outcome === 'closed_won').length
      const overallClosingRate = totalCalls > 0 ? (totalClosings / totalCalls) * 100 : 0

      const avgScore = repCalls.length > 0
        ? repCalls.reduce((sum, call) => sum + (call.weightedScore || 0), 0) / repCalls.length
        : 0

      const prevPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()))
      const prevCalls = await db.collection<CallEvaluation>(COLLECTIONS.CALL_EVALUATIONS)
        .find({
          organizationId: currentUser.organizationId,
          salesRepId: repId,
          evaluationDate: { $gte: prevPeriodStart, $lt: startDate }
        })
        .toArray()

      const prevAvgScore = prevCalls.length > 0
        ? prevCalls.reduce((sum, call) => sum + (call.weightedScore || 0), 0) / prevCalls.length
        : 0

      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (avgScore > prevAvgScore * 1.05) {
        trend = 'up'
      } else if (avgScore < prevAvgScore * 0.95) {
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
          r1Calls: r1Calls.length,
          r2Calls: r2Calls.length,
          r3Calls: r3Calls.length,
          r1ClosingRate: Math.round(r1ClosingRate * 10) / 10,
          r2ClosingRate: Math.round(r2ClosingRate * 10) / 10,
          overallClosingRate: Math.round(overallClosingRate * 10) / 10,
          thisMonthCalls: totalCalls,
          thisMonthClosings: totalClosings
        },
        performance: {
          trend,
          score: Math.round(avgScore),
          rank: 0
        }
      }
    })
  )

  const sorted = salesRepsWithMetrics.sort((a, b) => b.performance.score - a.performance.score)
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
      revalidate: 120, // 2 minutes cache
      tags: ['head-of-sales-reps', `timerange-${timeRange}`]
    }
  )

  return await getCachedReps()
}

async function fetchHeadOfSalesTeamMetricsData(timeRange: TimeRange, userId: string): Promise<TeamMetricsResponse> {
  const { db } = await connectToDatabase()
  const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })

  if (!currentUser) {
    throw new Error('User not found')
  }

  const startDate = resolveStartDate(timeRange)

  const totalReps = await db.collection<User>(COLLECTIONS.USERS).countDocuments({
    organizationId: currentUser.organizationId,
    role: { $in: ['sales_rep', 'manager'] },
    isActive: true
  })

  const callEvaluations = await db.collection<CallEvaluation>(COLLECTIONS.CALL_EVALUATIONS)
    .find({
      organizationId: currentUser.organizationId,
      evaluationDate: { $gte: startDate }
    })
    .toArray()

  const totalCalls = callEvaluations.length
  const totalPitches = callEvaluations.filter(call => call.callType !== 'PROSPECT').length

  const r1Calls = callEvaluations.filter(call => call.callType === 'R1')
  const r2Calls = callEvaluations.filter(call => call.callType === 'R2')
  const r3Calls = callEvaluations.filter(call => call.callType === 'R3')

  const r1Closings = r1Calls.filter(call => call.outcome === 'closed_won').length
  const r2Closings = r2Calls.filter(call => call.outcome === 'closed_won').length
  const r3Closings = r3Calls.filter(call => call.outcome === 'closed_won').length

  const r1ClosingRate = r1Calls.length > 0 ? (r1Closings / r1Calls.length) * 100 : 0
  const r2ClosingRate = r2Calls.length > 0 ? (r2Closings / r2Calls.length) * 100 : 0
  const r3ClosingRate = r3Calls.length > 0 ? (r3Closings / r3Calls.length) * 100 : 0

  const totalClosings = callEvaluations.filter(call => call.outcome === 'closed_won').length
  const averageClosingRate = totalCalls > 0 ? (totalClosings / totalCalls) * 100 : 0

  const salesReps = await db.collection<User>(COLLECTIONS.USERS)
    .find({
      organizationId: currentUser.organizationId,
      role: { $in: ['sales_rep', 'manager'] },
      isActive: true
    })
    .project({ firstName: 1, lastName: 1 })
    .toArray()

  let topPerformer = 'N/A'
  let bestScore = 0

  for (const rep of salesReps) {
    const repId = rep._id?.toString() || ''
    const repCalls = callEvaluations.filter(call => call.salesRepId === repId)

    if (repCalls.length > 0) {
      const avgScore = repCalls.reduce((sum, call) => sum + (call.weightedScore || 0), 0) / repCalls.length
      if (avgScore > bestScore) {
        bestScore = avgScore
        topPerformer = `${rep.firstName} ${rep.lastName}`.trim()
      }
    }
  }

  const teamMetrics: TeamMetricsResponse = {
    totalReps,
    totalCalls,
    totalPitches,
    averageClosingRate: Math.round(averageClosingRate * 10) / 10,
    topPerformer,
    callTypes: {
      R1: {
        count: r1Calls.length,
        closingRate: Math.round(r1ClosingRate * 10) / 10
      },
      R2: {
        count: r2Calls.length,
        closingRate: Math.round(r2ClosingRate * 10) / 10
      },
      R3: {
        count: r3Calls.length,
        closingRate: Math.round(r3ClosingRate * 10) / 10
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
      revalidate: 120, // 2 minutes cache
      tags: ['head-of-sales-metrics', `timerange-${timeRange}`]
    }
  )

  return await getCachedMetrics()
}
