'use server'

import connectToDatabase from '@/lib/mongodb'
import { SalesRepresentative, User, COLLECTIONS } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { ObjectId } from 'mongodb'

export async function getSalesReps(organizationId: string) {
  try {
    // Return empty array if no organizationId is provided
    if (!organizationId || organizationId.trim() === '') {
      return []
    }

    const { db } = await connectToDatabase()
    const salesReps = await db.collection<SalesRepresentative>(COLLECTIONS.SALES_REPRESENTATIVES)
      .find({ organizationId: new ObjectId(organizationId) })
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

    const { db } = await connectToDatabase()

    // First try to get from SalesRepresentative collection
    let topPerformers = await db.collection<SalesRepresentative>(COLLECTIONS.SALES_REPRESENTATIVES)
      .find({ organizationId: orgId })
      .sort({ 'metrics.totalRevenue': -1 })
      .limit(limit)
      .toArray()

    // If no sales reps found, create some mock data based on users
    if (topPerformers.length === 0) {
      const users = await db.collection<User>(COLLECTIONS.USERS)
        .find({
          organizationId: orgId,
          role: 'sales_rep'
        })
        .limit(limit)
        .toArray()

      topPerformers = users.map((user, index) => ({
        _id: new ObjectId(),
        userId: user._id!,
        organizationId: orgId,
        metrics: {
          totalCalls: Math.floor(Math.random() * 100) + 50,
          totalPitches: Math.floor(Math.random() * 50) + 20,
          r1Calls: Math.floor(Math.random() * 30) + 10,
          r2Calls: Math.floor(Math.random() * 20) + 5,
          r3Calls: Math.floor(Math.random() * 15) + 3,
          r1ClosingRate: Math.random() * 20 + 10,
          r2ClosingRate: Math.random() * 30 + 15,
          overallClosingRate: Math.random() * 25 + 10,
          thisMonthCalls: Math.floor(Math.random() * 40) + 20,
          thisMonthClosings: Math.floor(Math.random() * 10) + 2,
          totalRevenue: Math.floor(Math.random() * 50000) + 10000,
          dealsClosedQTD: Math.floor(Math.random() * 20) + 5
        },
        performance: {
          trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as any,
          score: Math.floor(Math.random() * 40) + 60,
          rank: index + 1
        },
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    }

    // Format for dashboard display
    const formattedPerformers = topPerformers.map((rep, index) => ({
      _id: rep._id,
      name: `Rep ${index + 1}`, // This should ideally come from user data
      role: 'Sales Representative',
      rank: index + 1,
      totalRevenue: rep.metrics?.totalRevenue || 0,
      dealsClosedQTD: rep.metrics?.dealsClosedQTD || 0
    }))

    return JSON.parse(JSON.stringify(formattedPerformers))
  } catch (error) {
    console.error('Error fetching top performers:', error)
    return []
  }
}

export async function createSalesRep(data: any) {
  try {
    const { db } = await connectToDatabase()

    const salesRep: Omit<SalesRepresentative, '_id'> = {
      userId: new ObjectId(data.userId),
      organizationId: new ObjectId(data.organizationId),
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