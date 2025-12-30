'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { SalesRepresentative, User, COLLECTIONS } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { ObjectId } from 'mongodb'
import { buildCallRecordsFilter, buildCallEvaluationsFilter, buildCallAnalysisFilter } from '@/lib/access-control'

export async function getSalesReps(organizationId: string) {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    // Return empty array if no organizationId is provided
    if (!organizationId || organizationId.trim() === '') {
      return []
    }

    const { db } = await connectToDatabase()

    // Get current user to check permissions
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return []
    }

    let filter: any = { organizationId: new ObjectId(organizationId) }
    if (!currentUser.isAdmin) {
      // Regular users can only see their own data
      filter.userId = currentUser._id
    }

    const salesReps = await db.collection<SalesRepresentative>(COLLECTIONS.SALES_REPRESENTATIVES)
      .find(filter)
      .sort({ 'metrics.totalRevenue': -1 })
      .toArray()

    // Add ranking based on sorted order and convert to serializable format
    const rankedReps = salesReps.map((rep, index) => ({
      ...rep,
      performance: {
        ...rep.performance,
        rank: index + 1
      }
    }))

    return JSON.parse(JSON.stringify(rankedReps))
  } catch (error) {
    console.error('Error fetching sales representatives:', error)
    return []
  }
}

export async function getTopPerformers(organizationId: string | any, limit: number = 3) {
  try {
    // Handle both string and object organizationId
    let orgIdString: string
    let orgId: ObjectId

    if (typeof organizationId === 'string') {
      if (!organizationId || organizationId.trim() === '') {
        return []
      }
      orgIdString = organizationId
      orgId = new ObjectId(organizationId)
    } else if (organizationId?._id) {
      orgIdString = organizationId._id.toString()
      orgId = new ObjectId(organizationId._id)
    } else {
      return []
    }

    const { userId } = await auth()
    if (!userId) {
      console.error('Unauthorized: No userId')
      return []
    }

    const { db } = await connectToDatabase()

    // Get current user to determine access level
    const currentUser = await db.collection<User>(COLLECTIONS.USERS)
      .findOne({ clerkId: userId })

    if (!currentUser) {
      console.error('User not found for clerkId:', userId)
      return []
    }

    // Build access filters
    const callRecordsAccessFilter = buildCallRecordsFilter(currentUser)
    const callEvaluationsAccessFilter = buildCallEvaluationsFilter(currentUser)

    // Get all users in the organization who are sales reps
    const users = await db.collection<User>(COLLECTIONS.USERS)
      .find({
        organizationId: orgId,
        isActive: true,
        role: { $in: ['sales_rep', 'manager', 'head_of_sales'] }
      })
      .toArray()

    if (users.length === 0) {
      return []
    }

    // Calculate performance for each user based on their actual call data
    const userPerformance = await Promise.all(users.map(async (user) => {
      const repId = user._id?.toString() || ''
      const repClerkId = user.clerkId || ''

      // Get call records for this sales rep with access control (by salesRepId or clerkId)
      const callRecords = await db.collection(COLLECTIONS.CALL_RECORDS)
        .find({
          ...callRecordsAccessFilter,
          $or: [
            { salesRepId: repId },
            { userId: repClerkId }
          ]
        })
        .toArray()

      // Get call evaluations for this sales rep with access control (by salesRepId or clerkId)
      const callEvaluations = await db.collection(COLLECTIONS.CALL_EVALUATIONS)
        .find({
          ...callEvaluationsAccessFilter,
          $or: [
            { salesRepId: repId },
            { userId: repClerkId }
          ]
        })
        .toArray()

      // Calculate metrics
      const totalCalls = callRecords.length
      const closedWonEvaluations = callEvaluations.filter(evaluation => evaluation.outcome === 'closed_won')
      const closedWonDeals = closedWonEvaluations.length
      const qualifiedLeads = callEvaluations.filter(evaluation => evaluation.outcome === 'qualified').length

      // Calculate average score
      const averageScore = callEvaluations.length > 0
        ? callEvaluations.reduce((sum, evaluation) => sum + (evaluation.weightedScore || evaluation.totalScore || 0), 0) / callEvaluations.length
        : 0

      // Calculate total revenue from actual deal values or estimate
      const totalRevenue = closedWonEvaluations.reduce((sum, evaluation) => {
        // Use actual deal value if available, otherwise estimate at $15k
        return sum + (evaluation.dealValue || 15000)
      }, 0)

      // Calculate this month's data
      const thisMonth = new Date()
      thisMonth.setDate(1)
      const thisMonthCalls = callRecords.filter(call => new Date(call.createdAt) >= thisMonth).length
      const thisMonthClosings = callEvaluations.filter(evaluation =>
        evaluation.outcome === 'closed_won' && new Date(evaluation.createdAt) >= thisMonth
      ).length

      return {
        _id: user._id,
        userId: user._id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        email: user.email,
        totalCalls,
        totalRevenue,
        dealsClosedQTD: closedWonDeals,
        qualifiedLeads,
        averageScore: Math.round(averageScore),
        thisMonthCalls,
        thisMonthClosings,
        overallClosingRate: totalCalls > 0 ? (closedWonDeals / totalCalls) * 100 : 0
      }
    }))

    // Sort by total revenue and take top performers
    const topPerformers = userPerformance
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit)
      .map((performer, index) => ({
        ...performer,
        rank: index + 1
      }))

    return JSON.parse(JSON.stringify(topPerformers))
  } catch (error) {
    console.error('Error fetching top performers:', error)
    return []
  }
}

export type RankingPeriod = 'current' | string // 'current' or 'YYYY-MM' format

function getPeriodDateRange(period: RankingPeriod): { start: Date; end: Date } {
  const now = new Date()

  if (period === 'current') {
    // Current month: from 1st of current month to now
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const end = now
    return { start, end }
  }

  // Historical period: 'YYYY-MM' format
  const [year, month] = period.split('-').map(Number)
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, month, 0, 23, 59, 59, 999) // Last day of month
  return { start, end }
}

export async function getAvailableRankingPeriods() {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { db } = await connectToDatabase()
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return []
    }

    const orgId = currentUser.organizationId

    // Get distinct months from call analyses
    const analyses = await db.collection(COLLECTIONS.CALL_ANALYSIS)
      .find({ organizationId: orgId })
      .project({ createdAt: 1 })
      .toArray()

    const monthsSet = new Set<string>()
    analyses.forEach((analysis: any) => {
      if (analysis.createdAt) {
        const date = new Date(analysis.createdAt)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        monthsSet.add(monthKey)
      }
    })

    // Sort descending (most recent first)
    const months = Array.from(monthsSet).sort().reverse()

    return months
  } catch (error) {
    console.error('Error fetching available periods:', error)
    return []
  }
}

export async function getSalesRanking(period: RankingPeriod = 'current') {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { db } = await connectToDatabase()

    // Get current user
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return []
    }

    // Only admins, managers, and head_of_sales can see the full team ranking
    const canSeeTeamRanking = currentUser.isAdmin || currentUser.isSuperAdmin ||
      currentUser.role === 'head_of_sales' || currentUser.role === 'manager'

    if (!canSeeTeamRanking) {
      // Sales reps don't have access to team ranking
      return []
    }

    const orgId = currentUser.organizationId
    const { start: periodStart, end: periodEnd } = getPeriodDateRange(period)

    // Get all users in the organization who are sales reps
    const users = await db.collection<User>(COLLECTIONS.USERS)
      .find({
        organizationId: orgId,
        isActive: true,
        role: { $in: ['sales_rep', 'manager', 'head_of_sales'] }
      })
      .toArray()

    if (users.length === 0) {
      return []
    }

    // Calculate performance for each user based on their actual call data FOR THE SELECTED PERIOD
    const userPerformance = await Promise.all(users.map(async (user) => {
      const repId = user._id?.toString() || ''
      const repClerkId = user.clerkId || ''

      // Date filter for the selected period
      const dateFilter = { $gte: periodStart, $lte: periodEnd }

      // Get call records for this sales rep FOR THE PERIOD
      const callRecords = await db.collection(COLLECTIONS.CALL_RECORDS)
        .find({
          organizationId: orgId,
          createdAt: dateFilter,
          $or: [
            { salesRepId: repId },
            { userId: repClerkId }
          ]
        })
        .toArray()

      // Get call evaluations for this sales rep FOR THE PERIOD
      const callEvaluations = await db.collection(COLLECTIONS.CALL_EVALUATIONS)
        .find({
          organizationId: orgId,
          createdAt: dateFilter,
          $or: [
            { salesRepId: repId },
            { userId: repClerkId }
          ]
        })
        .toArray()

      // Get call analyses FOR THE PERIOD
      const callAnalyses = await db.collection(COLLECTIONS.CALL_ANALYSIS)
        .find({
          organizationId: orgId,
          createdAt: dateFilter,
          $or: [
            { salesRepId: repId },
            { userId: repClerkId }
          ]
        })
        .toArray()

      // Calculate objections metrics and revenue from CallAnalysis
      let totalObjections = 0
      let objectionsResolved = 0
      let totalRevenue = 0
      let salesCount = 0

      callAnalyses.forEach((analysis: any) => {
        // Objections metrics
        if (analysis.objections_lead && Array.isArray(analysis.objections_lead)) {
          totalObjections += analysis.objections_lead.length
          objectionsResolved += analysis.objections_lead.filter((obj: any) => obj.resolue === true).length
        }
        // Revenue from actual sales (venteEffectuee)
        if (analysis.venteEffectuee === true && analysis.dealValue) {
          totalRevenue += analysis.dealValue
          salesCount++
        }
      })

      // Calculate metrics
      const totalCalls = callRecords.length
      const closedWonEvaluations = callEvaluations.filter(evaluation => evaluation.outcome === 'closed_won')
      // Use sales count from CallAnalysis if available, fallback to evaluations
      const dealsClosedQTD = salesCount > 0 ? salesCount : closedWonEvaluations.length
      const qualifiedLeads = callEvaluations.filter(evaluation => evaluation.outcome === 'qualified').length

      // Calculate closing rate based on actual sales
      const overallClosingRate = totalCalls > 0 ? (dealsClosedQTD / totalCalls) * 100 : 0

      // Calculate objections handling rate
      const objectionsHandlingRate = totalObjections > 0 ? (objectionsResolved / totalObjections) * 100 : 0

      // Calculate average score
      const averageScore = callEvaluations.length > 0
        ? callEvaluations.reduce((sum, evaluation) => sum + (evaluation.weightedScore || evaluation.totalScore || 0), 0) / callEvaluations.length
        : 0

      // For trend calculation, compare with previous period
      const periodDuration = periodEnd.getTime() - periodStart.getTime()
      const prevPeriodStart = new Date(periodStart.getTime() - periodDuration)
      const prevPeriodEnd = new Date(periodStart.getTime() - 1)

      const prevAnalyses = await db.collection(COLLECTIONS.CALL_ANALYSIS)
        .find({
          organizationId: orgId,
          createdAt: { $gte: prevPeriodStart, $lte: prevPeriodEnd },
          $or: [
            { salesRepId: repId },
            { userId: repClerkId }
          ]
        })
        .toArray()

      const prevSalesCount = prevAnalyses.filter((a: any) => a.venteEffectuee === true).length

      return {
        _id: user._id,
        userId: user._id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        email: user.email,
        avatar: user.avatar || `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`,
        totalCalls,
        totalRevenue,
        dealsClosedQTD,
        qualifiedLeads,
        averageScore: Math.round(averageScore),
        thisMonthCalls: totalCalls,
        thisMonthClosings: salesCount || dealsClosedQTD,
        overallClosingRate: Math.round(overallClosingRate * 10) / 10,
        totalObjections,
        objectionsResolved,
        objectionsHandlingRate: Math.round(objectionsHandlingRate * 10) / 10,
        trend: salesCount > prevSalesCount ? 'up' : salesCount < prevSalesCount ? 'down' : 'stable',
        trendValue: prevSalesCount > 0 ? Math.round(((salesCount - prevSalesCount) / prevSalesCount) * 100) : (salesCount > 0 ? 100 : 0)
      }
    }))

    // Sort by total revenue and add ranking
    const rankedPerformers = userPerformance
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .map((performer, index) => ({
        ...performer,
        rank: index + 1
      }))

    return JSON.parse(JSON.stringify(rankedPerformers))
  } catch (error) {
    console.error('Error fetching sales ranking:', error)
    return []
  }
}

export async function createSalesRep(data: any) {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { db } = await connectToDatabase()

    const salesRep: Omit<SalesRepresentative, '_id'> = {
      userId: new ObjectId(data.userId),
      organizationId: new ObjectId(data.organizationId),
      createdByUserId: userId,
      metrics: {
        totalCalls: data.totalCalls || 0,
        totalPitches: data.totalPitches || 0,
        r1Calls: data.r1Calls || 0,
        r2Calls: data.r2Calls || 0,
        r3Calls: data.r3Calls || 0,
        r1ClosingRate: data.r1ClosingRate || 0,
        r2ClosingRate: data.r2ClosingRate || 0,
        overallClosingRate: data.overallClosingRate || 0,
        thisMonthCalls: data.thisMonthCalls || 0,
        thisMonthClosings: data.thisMonthClosings || 0,
        totalRevenue: data.totalRevenue || 0,
        dealsClosedQTD: data.dealsClosedQTD || 0
      },
      performance: {
        trend: data.trend || 'stable',
        score: data.score || 0,
        rank: data.rank || 1
      },
      lastUpdated: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection<SalesRepresentative>(COLLECTIONS.SALES_REPRESENTATIVES).insertOne(salesRep)
    const savedRep = await db.collection<SalesRepresentative>(COLLECTIONS.SALES_REPRESENTATIVES)
      .findOne({ _id: result.insertedId })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/sales-ranking')

    return JSON.parse(JSON.stringify(savedRep))
  } catch (error) {
    console.error('Error creating sales representative:', error)
    throw new Error('Failed to create sales representative')
  }
}

export async function updateSalesRepMetrics(salesRepId: string, metrics: any) {
  try {
    const { db } = await connectToDatabase()

    const updatedRep = await db.collection<SalesRepresentative>(COLLECTIONS.SALES_REPRESENTATIVES)
      .findOneAndUpdate(
        { _id: new ObjectId(salesRepId) },
        {
          $set: {
            metrics: metrics,
            lastUpdated: new Date(),
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/sales-ranking')

    return JSON.parse(JSON.stringify(updatedRep))
  } catch (error) {
    console.error('Error updating sales rep metrics:', error)
    throw new Error('Failed to update sales rep metrics')
  }
}