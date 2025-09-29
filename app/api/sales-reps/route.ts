import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { CallEvaluation, User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user data
    const { db } = await connectToDatabase()
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission to view this data
    if (!['head_of_sales', 'admin', 'manager'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || 'thisMonth'

    // Calculate date range
    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case 'thisWeek':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
        break
      case 'thisQuarter':
        const quarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), quarter * 3, 1)
        break
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'thisMonth':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }

    // Get all sales reps in the organization
    const salesReps = await db.collection<User>(COLLECTIONS.USERS)
      .find({
        organizationId: currentUser.organizationId,
        role: { $in: ['sales_rep', 'manager'] },
        isActive: true
      })
      .project({ firstName: 1, lastName: 1, avatar: 1 })
      .toArray()

    // Get call evaluations for this time period
    const callEvaluations = await db.collection<CallEvaluation>(COLLECTIONS.CALL_EVALUATIONS)
      .find({
        organizationId: currentUser.organizationId,
        evaluationDate: { $gte: startDate }
      })
      .toArray()

    // Calculate metrics for each sales rep
    const salesRepsWithMetrics = await Promise.all(
      salesReps.map(async (rep) => {
        const repCalls = callEvaluations.filter(call => call.salesRepId === rep._id?.toString())

        // Calculate metrics
        const totalCalls = repCalls.length
        const totalPitches = repCalls.filter(call => call.callType !== 'PROSPECT').length

        const r1Calls = repCalls.filter(call => call.callType === 'R1').length
        const r2Calls = repCalls.filter(call => call.callType === 'R2').length
        const r3Calls = repCalls.filter(call => call.callType === 'R3').length

        const r1Closings = repCalls.filter(call => call.callType === 'R1' && call.outcome === 'closed_won').length
        const r2Closings = repCalls.filter(call => call.callType === 'R2' && call.outcome === 'closed_won').length

        const r1ClosingRate = r1Calls > 0 ? (r1Closings / r1Calls) * 100 : 0
        const r2ClosingRate = r2Calls > 0 ? (r2Closings / r2Calls) * 100 : 0

        const totalClosings = repCalls.filter(call => call.outcome === 'closed_won').length
        const overallClosingRate = totalCalls > 0 ? (totalClosings / totalCalls) * 100 : 0

        // Calculate performance score (weighted)
        const avgScore = repCalls.length > 0 ?
          repCalls.reduce((sum, call) => sum + call.weightedScore, 0) / repCalls.length : 0

        // Calculate trend (compare with previous period)
        const prevPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()))
        const prevCalls = await db.collection<CallEvaluation>(COLLECTIONS.CALL_EVALUATIONS)
          .find({
            organizationId: currentUser.organizationId,
            salesRepId: rep._id?.toString(),
            evaluationDate: { $gte: prevPeriodStart, $lt: startDate }
          })
          .toArray()

        const prevAvgScore = prevCalls.length > 0 ?
          prevCalls.reduce((sum, call) => sum + call.weightedScore, 0) / prevCalls.length : 0

        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (avgScore > prevAvgScore * 1.05) trend = 'up'
        else if (avgScore < prevAvgScore * 0.95) trend = 'down'

        return {
          id: rep._id?.toString(),
          firstName: rep.firstName,
          lastName: rep.lastName,
          avatar: rep.avatar,
          metrics: {
            totalCalls,
            totalPitches,
            r1Calls,
            r2Calls,
            r3Calls,
            r1ClosingRate: Math.round(r1ClosingRate * 10) / 10,
            r2ClosingRate: Math.round(r2ClosingRate * 10) / 10,
            overallClosingRate: Math.round(overallClosingRate * 10) / 10,
            thisMonthCalls: totalCalls,
            thisMonthClosings: totalClosings
          },
          performance: {
            trend,
            score: Math.round(avgScore),
            rank: 0 // Will be calculated after sorting
          }
        }
      })
    )

    // Sort by performance score and assign ranks
    const sortedReps = salesRepsWithMetrics.sort((a, b) => b.performance.score - a.performance.score)
    sortedReps.forEach((rep, index) => {
      rep.performance.rank = index + 1
    })

    return NextResponse.json(sortedReps)
  } catch (error) {
    console.error('Error fetching sales reps:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}