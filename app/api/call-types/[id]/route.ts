import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import { CallType } from '@/lib/models/call-type'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!['admin', 'head_of_sales', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, description, metrics, evaluationCriteria, color, isActive } = body

    await dbConnect()

    // Find the call type and ensure it belongs to the user's organization
    const callType = await CallType.findOne({
      _id: params.id,
      organizationId: session.user.organizationId
    })

    if (!callType) {
      return NextResponse.json({ error: 'Call type not found' }, { status: 404 })
    }

    // Check if code already exists for another call type in this organization
    if (code && code.toUpperCase() !== callType.code) {
      const existingCallType = await CallType.findOne({
        organizationId: session.user.organizationId,
        code: code.toUpperCase(),
        _id: { $ne: params.id }
      })

      if (existingCallType) {
        return NextResponse.json(
          { error: 'Call type code already exists' },
          { status: 400 }
        )
      }
    }

    // Update the call type
    const updatedCallType = await CallType.findByIdAndUpdate(
      params.id,
      {
        name: name || callType.name,
        code: code ? code.toUpperCase() : callType.code,
        description: description || callType.description,
        color: color || callType.color,
        isActive: isActive !== undefined ? isActive : callType.isActive,
        metrics: {
          targetClosingRate: metrics?.targetClosingRate || callType.metrics.targetClosingRate,
          avgDuration: metrics?.avgDuration || callType.metrics.avgDuration,
          followUpRequired: metrics?.followUpRequired !== undefined ? metrics.followUpRequired : callType.metrics.followUpRequired
        },
        evaluationCriteria: evaluationCriteria || callType.evaluationCriteria
      },
      { new: true }
    )

    return NextResponse.json(updatedCallType)
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!['admin', 'head_of_sales', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    await dbConnect()

    // Find and delete the call type, ensuring it belongs to the user's organization
    const callType = await CallType.findOneAndDelete({
      _id: params.id,
      organizationId: session.user.organizationId
    })

    if (!callType) {
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