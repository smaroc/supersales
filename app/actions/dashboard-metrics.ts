'use server'

import connectToDatabase from '@/lib/mongodb'
import { DashboardMetrics, COLLECTIONS } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { ObjectId } from 'mongodb'

export async function getDashboardMetrics(organizationId: string | any, period: string = 'monthly') {
  try {
    const { db } = await connectToDatabase()

    // Handle both string and object organizationId
    const orgId = typeof organizationId === 'string'
      ? new ObjectId(organizationId)
      : organizationId._id ? new ObjectId(organizationId._id) : new ObjectId(organizationId)

    const metrics = await db.collection<DashboardMetrics>(COLLECTIONS.DASHBOARD_METRICS)
      .findOne({
        organizationId: orgId,
        period: period as any
      }, {
        sort: { createdAt: -1 }
      })

    if (!metrics) {
      // Return default metrics if none found
      return {
        organizationId,
        totalCalls: 0,
        conversionRate: 0,
        totalRevenue: 0,
        teamPerformance: 0,
        period,
        date: new Date()
      }
    }

    return JSON.parse(JSON.stringify(metrics))
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
    const { db } = await connectToDatabase()
    const metrics: Omit<DashboardMetrics, '_id'> = {
      organizationId: new ObjectId(data.organizationId),
      period: (data.period || 'monthly') as any,
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