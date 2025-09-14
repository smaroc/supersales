import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import { CallEvaluation } from '@/lib/models/call-evaluation'
import { CallType } from '@/lib/models/call-type'
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')

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

    // Get call evaluations with pagination
    const evaluations = await CallEvaluation.find({
      organizationId: session.user.organizationId,
      evaluationDate: { $gte: startDate }
    })
    .sort({ evaluationDate: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .lean()

    // Get all sales reps for filters
    const salesReps = await User.find({
      organizationId: session.user.organizationId,
      role: { $in: ['sales_rep', 'manager'] },
      isActive: true
    }).select('firstName lastName').lean()

    // Get all call types for filters
    const callTypes = await CallType.find({
      organizationId: session.user.organizationId,
      isActive: true
    }).select('code').lean()

    // Transform evaluations to include sales rep information
    const callsWithDetails = await Promise.all(
      evaluations.map(async (evaluation) => {
        const salesRep = await User.findById(evaluation.salesRepId)
          .select('firstName lastName avatar')
          .lean()

        return {
          _id: evaluation._id,
          callId: evaluation.callId,
          salesRep: salesRep ? {
            id: (salesRep as any)._id?.toString() || (salesRep as any).id,
            firstName: (salesRep as any).firstName,
            lastName: (salesRep as any).lastName,
            avatar: (salesRep as any).avatar
          } : {
            id: evaluation.salesRepId,
            firstName: 'Commercial',
            lastName: 'Supprimé'
          },
          callType: evaluation.callType,
          evaluationDate: evaluation.evaluationDate,
          duration: evaluation.duration,
          outcome: evaluation.outcome,
          totalScore: evaluation.totalScore,
          weightedScore: evaluation.weightedScore,
          scores: evaluation.scores,
          notes: evaluation.notes,
          nextSteps: evaluation.nextSteps,
          recording: evaluation.recording
        }
      })
    )

    const response = {
      calls: callsWithDetails,
      pagination: {
        page,
        limit,
        total: await CallEvaluation.countDocuments({
          organizationId: session.user.organizationId,
          evaluationDate: { $gte: startDate }
        })
      },
      salesReps: salesReps.map(rep => ({
        id: (rep as any)._id.toString(),
        name: `${(rep as any).firstName} ${(rep as any).lastName}`
      })),
      callTypes: Array.from(new Set(callTypes.map(ct => ct.code)))
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching call evaluations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}