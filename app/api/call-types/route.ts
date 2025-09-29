import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { CallType, User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

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

    const callTypes = await db.collection<CallType>(COLLECTIONS.CALL_TYPES)
      .find({ organizationId: currentUser.organizationId })
      .sort({ order: 1 })
      .toArray()

    return NextResponse.json(JSON.parse(JSON.stringify(callTypes)))
  } catch (error) {
    console.error('Error fetching call types:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    // Check permissions
    if (!['admin', 'head_of_sales', 'manager'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, description, metrics, evaluationCriteria, color } = body

    if (!name || !code || !description) {
      return NextResponse.json(
        { error: 'Name, code, and description are required' },
        { status: 400 }
      )
    }

    // Check if code already exists for this organization
    const existingCallType = await db.collection<CallType>(COLLECTIONS.CALL_TYPES).findOne({
      organizationId: currentUser.organizationId,
      code: code.toUpperCase()
    })

    if (existingCallType) {
      return NextResponse.json(
        { error: 'Call type code already exists' },
        { status: 400 }
      )
    }

    // Get the next order number
    const lastCallType = await db.collection<CallType>(COLLECTIONS.CALL_TYPES)
      .findOne(
        { organizationId: currentUser.organizationId },
        { sort: { order: -1 } }
      )

    const order = lastCallType ? lastCallType.order + 1 : 1

    const callType: Omit<CallType, '_id'> = {
      organizationId: currentUser.organizationId,
      name,
      code: code.toUpperCase(),
      description,
      order,
      color: color || '#3B82F6',
      isActive: true,
      metrics: {
        targetClosingRate: metrics?.targetClosingRate || 20,
        avgDuration: metrics?.avgDuration || 30,
        followUpDays: metrics?.followUpDays || 3
      },
      criteria: evaluationCriteria || [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection<CallType>(COLLECTIONS.CALL_TYPES).insertOne(callType)
    const savedCallType = await db.collection<CallType>(COLLECTIONS.CALL_TYPES)
      .findOne({ _id: result.insertedId })

    return NextResponse.json(JSON.parse(JSON.stringify(savedCallType)), { status: 201 })
  } catch (error) {
    console.error('Error creating call type:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}