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
      const userId = user._id?.toString() || user.clerkId

      // Get call records for this sales rep with access control
      const callRecords = await db.collection(COLLECTIONS.CALL_RECORDS)
        .find({
          ...callRecordsAccessFilter,
          salesRepId: userId
        })
        .toArray()

      // Get call evaluations for this sales rep with access control
      const callEvaluations = await db.collection(COLLECTIONS.CALL_EVALUATIONS)
        .find({
          ...callEvaluationsAccessFilter,
          salesRepId: userId
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

export async function getSalesRanking() {
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

    const orgId = currentUser.organizationId

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
      const userIdStr = user._id?.toString() || user.clerkId

      // Get call records for this sales rep
      const callRecords = await db.collection(COLLECTIONS.CALL_RECORDS)
        .find({
          organizationId: orgId,
          salesRepId: userIdStr
        })
        .toArray()

      // Get call evaluations for this sales rep
      const callEvaluations = await db.collection(COLLECTIONS.CALL_EVALUATIONS)
        .find({
          organizationId: orgId,
          salesRepId: userIdStr
        })
        .toArray()

      // Get call analyses to extract objections data
      const callAnalyses = await db.collection(COLLECTIONS.CALL_ANALYSIS)
        .find({
          organizationId: orgId,
          salesRepId: userIdStr
        })
        .toArray()

      // Calculate objections metrics
      let totalObjections = 0
      let objectionsResolved = 0

      callAnalyses.forEach((analysis: any) => {
        if (analysis.objections_lead && Array.isArray(analysis.objections_lead)) {
          totalObjections += analysis.objections_lead.length
          objectionsResolved += analysis.objections_lead.filter((obj: any) => obj.resolue === true).length
        }
      })

      // Calculate metrics
      const totalCalls = callRecords.length
      const closedWonEvaluations = callEvaluations.filter(evaluation => evaluation.outcome === 'closed_won')
      const closedWonDeals = closedWonEvaluations.length
      const qualifiedLeads = callEvaluations.filter(evaluation => evaluation.outcome === 'qualified').length

      // Calculate closing rate
      const overallClosingRate = totalCalls > 0 ? (closedWonDeals / totalCalls) * 100 : 0

      // Calculate objections handling rate
      const objectionsHandlingRate = totalObjections > 0 ? (objectionsResolved / totalObjections) * 100 : 0

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
        avatar: user.avatar || `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`,
        totalCalls,
        totalRevenue,
        dealsClosedQTD: closedWonDeals,
        qualifiedLeads,
        averageScore: Math.round(averageScore),
        thisMonthCalls,
        thisMonthClosings,
        overallClosingRate: Math.round(overallClosingRate * 10) / 10,
        totalObjections,
        objectionsResolved,
        objectionsHandlingRate: Math.round(objectionsHandlingRate * 10) / 10,
        trend: thisMonthClosings > (closedWonDeals - thisMonthClosings) ? 'up' : 'down',
        trendValue: thisMonthClosings > 0 ? Math.round(((thisMonthClosings / (closedWonDeals || 1)) * 100)) : 0
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