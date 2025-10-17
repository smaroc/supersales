'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { DashboardMetrics, User, CallAnalysis, CallRecord, COLLECTIONS } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { ObjectId } from 'mongodb'
import { buildAccessFilter } from '@/lib/access-control'

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
    if (currentUser.isSuperAdmin) {
      // Super admin sees all data
      filter = {}
    } else if (currentUser.isAdmin) {
      // Admin sees all data for their organization
      filter = { organizationId: orgId }
    } else {
      // Regular user sees only their own data
      filter = { userId: userId }
    }

    // Calculate real metrics from CallAnalysis collection for consistency
    const callAnalyses = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS).find(filter).toArray()

    // Calculate total calls
    const totalCalls = callAnalyses.length

    // Calculate conversion rate from call analyses using venteEffectuee
    const closedDeals = callAnalyses.filter(analysis => analysis.venteEffectuee === true).length
    const conversionRate = totalCalls > 0 ? (closedDeals / totalCalls) * 100 : 0

    // Calculate total revenue (estimate based on deals)
    const totalRevenue = closedDeals * 15000 // Assume $15k average deal size

    // Calculate team performance (average score from noteGlobale)
    const averageScore = callAnalyses.length > 0
      ? callAnalyses.reduce((sum, analysis) => sum + (analysis.noteGlobale?.total || 0), 0) / callAnalyses.length
      : 0

    // Calculate average call duration from call analyses
    const avgCallDuration = callAnalyses.length > 0
      ? callAnalyses.reduce((sum, analysis) => {
          // Parse duration string like "25 min" to minutes
          const durationMatch = analysis.dureeAppel?.match(/(\d+)/)
          const minutes = durationMatch ? parseInt(durationMatch[1]) : 0
          return sum + minutes
        }, 0) / callAnalyses.length
      : 0

    // Count qualified leads (calls with score >= 50 but no sale)
    const qualifiedLeads = callAnalyses.filter(analysis =>
      !analysis.venteEffectuee && (analysis.noteGlobale?.total || 0) >= 50
    ).length

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

export async function getRecentActivities(organizationId: string, limit: number = 5) {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { db } = await connectToDatabase()

    // Get current user to determine access level
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      throw new Error('User not found')
    }

    // Build access filter based on user permissions
    const filter = buildAccessFilter(currentUser)

    // Get recent call analyses and call records
    const [recentAnalyses, recentCallRecords] = await Promise.all([
      db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 2)
        .toArray(),
      db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS)
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 2)
        .toArray()
    ])

    const activities: any[] = []

    // Add deal closed activities
    const dealsClosedActivities = recentAnalyses
      .filter(analysis => analysis.venteEffectuee === true)
      .slice(0, Math.ceil(limit / 2))
      .map(analysis => ({
        type: 'deal_closed',
        timestamp: analysis.createdAt,
        salesRep: analysis.closeur || 'Sales Rep',
        client: analysis.prospect || 'Client',
        title: `${analysis.closeur || 'Sales Rep'} closed a deal`,
        description: `${analysis.prospect || 'Client'} · Call duration: ${analysis.dureeAppel || 'N/A'}`,
        icon: 'award',
        color: 'green'
      }))

    activities.push(...dealsClosedActivities)

    // Add call analysis completed activities
    const callAnalysisActivities = recentAnalyses
      .filter(analysis => analysis.analysisStatus === 'completed')
      .slice(0, Math.ceil(limit / 3))
      .map(analysis => {
        const score = analysis.noteGlobale?.total || 0
        const sentiment = score >= 70 ? 'positive' : score >= 50 ? 'neutral' : 'negative'

        return {
          type: 'call_analysis',
          timestamp: analysis.createdAt,
          salesRep: analysis.closeur || 'Sales Rep',
          client: analysis.prospect || 'Client',
          title: `${analysis.closeur || 'Sales Rep'} completed call analysis`,
          description: `${analysis.prospect || 'Client'} · ${analysis.dureeAppel || 'N/A'} call, ${sentiment} sentiment`,
          icon: 'phone',
          color: 'blue',
          score: score
        }
      })

    activities.push(...callAnalysisActivities)

    // Add performance improvement activities
    // Get sales reps with multiple calls to calculate improvement
    const salesRepCallsMap = new Map<string, CallAnalysis[]>()
    recentAnalyses.forEach(analysis => {
      const rep = analysis.closeur || analysis.salesRepId || 'Unknown'
      if (!salesRepCallsMap.has(rep)) {
        salesRepCallsMap.set(rep, [])
      }
      salesRepCallsMap.get(rep)!.push(analysis)
    })

    salesRepCallsMap.forEach((calls, rep) => {
      if (calls.length >= 2) {
        const sortedCalls = calls.sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        const oldScore = sortedCalls[0]?.noteGlobale?.total || 0
        const newScore = sortedCalls[sortedCalls.length - 1]?.noteGlobale?.total || 0

        if (newScore > oldScore && newScore - oldScore >= 10) {
          activities.push({
            type: 'performance_improvement',
            timestamp: sortedCalls[sortedCalls.length - 1].createdAt,
            salesRep: rep,
            title: `${rep} improved performance`,
            description: `From ${oldScore}% to ${newScore}% average score`,
            icon: 'trending',
            color: 'purple',
            improvement: newScore - oldScore
          })
        }
      }
    })

    // Sort all activities by timestamp and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
      .map(activity => ({
        ...activity,
        timeAgo: getTimeAgo(activity.timestamp)
      }))

    return sortedActivities
  } catch (error) {
    console.error('Error fetching recent activities:', error)
    return []
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) {
    return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  } else {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
  }
}