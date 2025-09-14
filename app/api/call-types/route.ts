import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import { CallType } from '@/lib/models/call-type'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const callTypes = await CallType.find({
      organizationId: session.user.organizationId
    }).sort({ order: 1 })

    return NextResponse.json(callTypes)
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
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!['admin', 'head_of_sales', 'manager'].includes(session.user.role)) {
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

    await dbConnect()

    // Check if code already exists for this organization
    const existingCallType = await CallType.findOne({
      organizationId: session.user.organizationId,
      code: code.toUpperCase()
    })

    if (existingCallType) {
      return NextResponse.json(
        { error: 'Call type code already exists' },
        { status: 400 }
      )
    }

    // Get the next order number
    const lastCallType = await CallType.findOne({
      organizationId: session.user.organizationId
    }).sort({ order: -1 })

    const order = lastCallType ? lastCallType.order + 1 : 1

    const callType = new CallType({
      organizationId: session.user.organizationId,
      name,
      code: code.toUpperCase(),
      description,
      order,
      color: color || '#3B82F6',
      metrics: {
        targetClosingRate: metrics?.targetClosingRate || 20,
        avgDuration: metrics?.avgDuration || 30,
        followUpRequired: metrics?.followUpRequired || false
      },
      evaluationCriteria: evaluationCriteria || []
    })

    await callType.save()

    return NextResponse.json(callType, { status: 201 })
  } catch (error) {
    console.error('Error creating call type:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}