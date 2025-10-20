import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { criteria, autoRunCustomCriteria } = await request.json()

    if (!Array.isArray(criteria)) {
      return NextResponse.json({ error: 'Invalid criteria format' }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const usersCollection = db.collection('users')

    // Get the user to check admin status
    const user = await usersCollection.findOne({ clerkId: userId })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is admin or superadmin
    if (!user.isAdmin && !user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden: Only admins can manage custom criteria' }, { status: 403 })
    }

    // Update user's custom criteria and auto-run preference
    const updateFields: any = {
      customAnalysisCriteria: criteria,
      updatedAt: new Date()
    }

    // Only update autoRunCustomCriteria if it's provided
    if (autoRunCustomCriteria !== undefined) {
      updateFields.autoRunCustomCriteria = autoRunCustomCriteria
    }

    const result = await usersCollection.updateOne(
      { clerkId: userId },
      { $set: updateFields }
    )

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: 'Failed to update criteria' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Custom criteria updated successfully',
      criteria,
      autoRunCustomCriteria
    })
  } catch (error) {
    console.error('Error updating custom criteria:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    const usersCollection = db.collection('users')

    const user = await usersCollection.findOne({ clerkId: userId })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      criteria: user.customAnalysisCriteria || [],
      autoRunCustomCriteria: user.autoRunCustomCriteria || false
    })
  } catch (error) {
    console.error('Error fetching custom criteria:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
