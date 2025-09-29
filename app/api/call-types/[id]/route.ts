import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { CallType, User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
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

    // Check permissions
    if (!['admin', 'head_of_sales', 'manager'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, description, metrics, evaluationCriteria, color, isActive } = body

    // Find the call type and ensure it belongs to the user's organization
    const callType = await db.collection<CallType>(COLLECTIONS.CALL_TYPES).findOne({
      _id: new ObjectId(resolvedParams.id),
      organizationId: currentUser.organizationId
    })

    if (!callType) {
      return NextResponse.json({ error: 'Call type not found' }, { status: 404 })
    }

    // Check if code already exists for another call type in this organization
    if (code && code.toUpperCase() !== callType.code) {
      const existingCallType = await db.collection<CallType>(COLLECTIONS.CALL_TYPES).findOne({
        organizationId: currentUser.organizationId,
        code: code.toUpperCase(),
        _id: { $ne: new ObjectId(resolvedParams.id) }
      })

      if (existingCallType) {
        return NextResponse.json(
          { error: 'Call type code already exists' },
          { status: 400 }
        )
      }
    }

    // Update the call type
    const updatedCallType = await db.collection<CallType>(COLLECTIONS.CALL_TYPES).findOneAndUpdate(
      { _id: new ObjectId(resolvedParams.id) },
      {
        $set: {
          name: name || callType.name,
          code: code ? code.toUpperCase() : callType.code,
          description: description || callType.description,
          color: color || callType.color,
          isActive: isActive !== undefined ? isActive : callType.isActive,
          metrics: {
            targetClosingRate: metrics?.targetClosingRate || callType.metrics.targetClosingRate,
            avgDuration: metrics?.avgDuration || callType.metrics.avgDuration,
            followUpDays: metrics?.followUpDays || callType.metrics.followUpDays
          },
          criteria: evaluationCriteria || callType.criteria,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )

    return NextResponse.json(JSON.parse(JSON.stringify(updatedCallType)))
  } catch (error) {
    console.error('Error updating call type:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
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

    // Check permissions
    if (!['admin', 'head_of_sales', 'manager'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Find and delete the call type, ensuring it belongs to the user's organization
    const result = await db.collection<CallType>(COLLECTIONS.CALL_TYPES).deleteOne({
      _id: new ObjectId(resolvedParams.id),
      organizationId: currentUser.organizationId
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Call type not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Call type deleted successfully' })
  } catch (error) {
    console.error('Error deleting call type:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}