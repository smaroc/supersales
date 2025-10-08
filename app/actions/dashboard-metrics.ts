'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { DashboardMetrics, User, COLLECTIONS } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { ObjectId } from 'mongodb'

export async function getDashboardMetrics(organizationId: string | any, period: string = 'monthly') {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { db } = await connectToDatabase()

    // Get current user to check if admin
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      throw new Error('User not found')
    }

    // Handle both string and object organizationId
    const orgId = typeof organizationId === 'string'
      ? new ObjectId(organizationId)
      : organizationId._id ? new ObjectId(organizationId._id) : new ObjectId(organizationId)

    let filter: any = {}
    if (currentUser.isAdmin) {
      // Admin sees all data for their organization
      filter = { organizationId: orgId }
    } else {
      // Regular user sees only their own data
      filter = { userId: userId }
    }

    // Calculate real metrics from CallRecord and CallEvaluation collections
    const [callRecords, callEvaluations] = await Promise.all([
      db.collection(COLLECTIONS.CALL_RECORDS).find(filter).toArray(),
      db.collection(COLLECTIONS.CALL_EVALUATIONS).find(filter).toArray()
    ])

    // Calculate total calls
    const totalCalls = callRecords.length

    // Calculate conversion rate from evaluations
    const closedWonEvaluations = callEvaluations.filter(evaluation => evaluation.outcome === 'closed_won')
    const conversionRate = totalCalls > 0 ? (closedWonEvaluations.length / totalCalls) * 100 : 0

    // Calculate total revenue (estimate based on deals)
    const totalRevenue = closedWonEvaluations.length * 15000 // Assume $15k average deal size

    // Calculate team performance (average weighted score)
    const averageScore = callEvaluations.length > 0
      ? callEvaluations.reduce((sum, evaluation) => sum + (evaluation.weightedScore || 0), 0) / callEvaluations.length
      : 0

    // Calculate average call duration
    const avgCallDuration = callRecords.length > 0
      ? callRecords.reduce((sum, call) => sum + (call.actualDuration || 0), 0) / callRecords.length
      : 0

    // Count qualified leads
    const qualifiedLeads = callEvaluations.filter(evaluation => evaluation.outcome === 'qualified').length

    // Count closed deals
    const closedDeals = closedWonEvaluations.length

    return {
      organizationId,
      totalCalls,
      conversionRate,
      totalRevenue,
      teamPerformance: Math.round(averageScore),
      avgCallDuration: Math.round(avgCallDuration),
      qualifiedLeads,
      closedDeals,
      period,
      date: new Date()
    }
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    throw new Error('Failed to fetch dashboard metrics')
  }
}

export async function createDashboardMetrics(data: {
  organizationId: string
  totalCalls: number
  conversionRate: number
  totalRevenue: number
  teamPerformance: number
  period?: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  date?: Date
}) {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { db } = await connectToDatabase()
    const metrics: Omit<DashboardMetrics, '_id'> = {
      organizationId: new ObjectId(data.organizationId),
      userId: userId,
      period: (data.period || 'monthly') as DashboardMetrics['period'],
      date: data.date || new Date(),
      metrics: {
        totalCalls: data.totalCalls,
        totalRevenue: data.totalRevenue,
        conversionRate: data.conversionRate,
        teamPerformance: data.teamPerformance,
        avgCallDuration: 0,
        qualifiedLeads: 0,
        closedDeals: 0
      },
      breakdown: {
        byCallType: {},
        bySalesRep: {},
        byOutcome: {}
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection<DashboardMetrics>(COLLECTIONS.DASHBOARD_METRICS).insertOne(metrics)
    const savedMetrics = await db.collection<DashboardMetrics>(COLLECTIONS.DASHBOARD_METRICS)
      .findOne({ _id: result.insertedId })

    // Revalidate the pages that display this data
    revalidatePath('/dashboard')

    return JSON.parse(JSON.stringify(savedMetrics))
  } catch (error) {
    console.error('Error creating dashboard metrics:', error)
    throw new Error('Failed to create dashboard metrics')
  }
}

export async function updateDashboardMetrics(
  organizationId: string,
  period: string = 'monthly',
  updates: {
    totalCalls?: number
    conversionRate?: number
    totalRevenue?: number
    teamPerformance?: number
  }
) {
  try {
    const { db } = await connectToDatabase()
    const updatedMetrics = await db.collection<DashboardMetrics>(COLLECTIONS.DASHBOARD_METRICS)
      .findOneAndUpdate(
        {
          organizationId: new ObjectId(organizationId),
          period: period as any
        },
        {
          $set: {
            'metrics.totalCalls': updates.totalCalls,
            'metrics.conversionRate': updates.conversionRate,
            'metrics.totalRevenue': updates.totalRevenue,
            'metrics.teamPerformance': updates.teamPerformance,
            date: new Date(),
            updatedAt: new Date()
          }
        },
        {
          returnDocument: 'after',
          upsert: true
        }
      )

    // Revalidate the pages that display this data
    revalidatePath('/dashboard')

    return JSON.parse(JSON.stringify(updatedMetrics))
  } catch (error) {
    console.error('Error updating dashboard metrics:', error)
    throw new Error('Failed to update dashboard metrics')
  }
}