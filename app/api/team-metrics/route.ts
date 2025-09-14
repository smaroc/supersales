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

    // Get all sales reps count
    const totalReps = await User.countDocuments({
      organizationId: session.user.organizationId,
      role: { $in: ['sales_rep', 'manager'] },
      isActive: true
    })

    // Get call evaluations for this time period
    const callEvaluations = await CallEvaluation.find({
      organizationId: session.user.organizationId,
      evaluationDate: { $gte: startDate }
    }).lean()

    const totalCalls = callEvaluations.length
    const totalPitches = callEvaluations.filter(call => call.callType !== 'PROSPECTION').length

    // Calculate closing rates by call type
    const r1Calls = callEvaluations.filter(call => call.callType === 'R1')
    const r2Calls = callEvaluations.filter(call => call.callType === 'R2')
    const r3Calls = callEvaluations.filter(call => call.callType === 'R3')

    const r1Closings = r1Calls.filter(call => call.outcome === 'closed_won').length
    const r2Closings = r2Calls.filter(call => call.outcome === 'closed_won').length
    const r3Closings = r3Calls.filter(call => call.outcome === 'closed_won').length

    const r1ClosingRate = r1Calls.length > 0 ? (r1Closings / r1Calls.length) * 100 : 0
    const r2ClosingRate = r2Calls.length > 0 ? (r2Closings / r2Calls.length) * 100 : 0
    const r3ClosingRate = r3Calls.length > 0 ? (r3Closings / r3Calls.length) * 100 : 0

    // Calculate average closing rate
    const totalClosings = callEvaluations.filter(call => call.outcome === 'closed_won').length
    const averageClosingRate = totalCalls > 0 ? (totalClosings / totalCalls) * 100 : 0

    // Find top performer
    const salesReps = await User.find({
      organizationId: session.user.organizationId,
      role: { $in: ['sales_rep', 'manager'] },
      isActive: true
    }).select('firstName lastName').lean()

    let topPerformer = 'N/A'
    let bestScore = 0

    for (const rep of salesReps) {
      const repCalls = callEvaluations.filter(call => call.salesRepId === (rep as any)._id.toString())
      if (repCalls.length > 0) {
        const avgScore = repCalls.reduce((sum, call) => sum + call.weightedScore, 0) / repCalls.length
        if (avgScore > bestScore) {
          bestScore = avgScore
          topPerformer = `${(rep as any).firstName} ${(rep as any).lastName}`
        }
      }
    }

    const teamMetrics = {
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

    return NextResponse.json(teamMetrics)
  } catch (error) {
    console.error('Error fetching team metrics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}