import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { CallRecord, User, COLLECTIONS } from '@/lib/types'
import { CallEvaluationService } from '@/lib/services/call-evaluation-service'
import { ObjectId } from 'mongodb'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if user has permission to evaluate calls
    if (!['admin', 'owner', 'head_of_sales', 'manager'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Find the call record
    const callRecord = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).findOne({
      _id: new ObjectId(params.id),
      organizationId: currentUser.organizationId
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