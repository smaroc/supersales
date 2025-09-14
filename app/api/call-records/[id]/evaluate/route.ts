import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import CallRecord from '@/models/CallRecord'
import { CallEvaluationService } from '@/lib/services/call-evaluation-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to evaluate calls
    if (!['admin', 'owner', 'head_of_sales', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    await dbConnect()

    // Find the call record
    const callRecord = await CallRecord.findOne({
      _id: params.id,
      organizationId: session.user.organizationId
    })

    if (!callRecord) {
      return NextResponse.json({ error: 'Call record not found' }, { status: 404 })
    }

    // Check if already evaluated
    if (callRecord.status === 'evaluated') {
      return NextResponse.json(
        { error: 'Call record has already been evaluated' },
        { status: 400 }
      )
    }

    // Process the evaluation
    const evaluation = await CallEvaluationService.processCallRecord(params.id)

    return NextResponse.json({
      message: 'Call evaluation completed successfully',
      evaluation: {
        id: evaluation._id,
        totalScore: evaluation.totalScore,
        weightedScore: evaluation.weightedScore,
        outcome: evaluation.outcome,
        nextSteps: evaluation.nextSteps
      }
    })

  } catch (error) {
    console.error('Error evaluating call record:', error)
    return NextResponse.json(
      { 
        error: 'Failed to evaluate call record',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}