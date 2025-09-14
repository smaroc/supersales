import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import { CallEvaluation } from '@/lib/models/call-evaluation'
import User from '@/models/User'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to view this data
    if (!['head_of_sales', 'admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || 'thisMonth'

    await dbConnect()

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
    const salesReps = await User.find({
      organizationId: session.user.organizationId,
      role: { $in: ['sales_rep', 'manager'] },
      isActive: true
    }).select('firstName lastName avatar').lean()

    // Get call evaluations for this time period
    const callEvaluations = await CallEvaluation.find({
      organizationId: session.user.organizationId,
      evaluationDate: { $gte: startDate }
    }).lean()

    // Calculate metrics for each sales rep
    const salesRepsWithMetrics = await Promise.all(
      salesReps.map(async (rep) => {
        const repCalls = callEvaluations.filter(call => call.salesRepId === (rep as any)._id.toString())
        
        // Calculate metrics
        const totalCalls = repCalls.length
        const totalPitches = repCalls.filter(call => call.callType !== 'PROSPECTION').length
        
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
        const prevCalls = await CallEvaluation.find({
          organizationId: session.user.organizationId,
          salesRepId: (rep as any)._id.toString(),
          evaluationDate: { $gte: prevPeriodStart, $lt: startDate }
        }).lean()
        
        const prevAvgScore = prevCalls.length > 0 ? 
          prevCalls.reduce((sum, call) => sum + call.weightedScore, 0) / prevCalls.length : 0
        
        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (avgScore > prevAvgScore * 1.05) trend = 'up'
        else if (avgScore < prevAvgScore * 0.95) trend = 'down'

        return {
          id: (rep as any)._id.toString(),
          firstName: (rep as any).firstName,
          lastName: (rep as any).lastName,
          avatar: (rep as any).avatar,
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