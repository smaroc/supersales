import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { User, COLLECTIONS } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { db } = await connectToDatabase()

    // Get current user and check if they're admin
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!currentUser.isAdmin && !['admin', 'owner'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Only admins can manage users' }, { status: 403 })
    }

    // Get all users in the organization
    const users = await db.collection<User>(COLLECTIONS.USERS)
      .find({ organizationId: currentUser.organizationId })
      .project({
        clerkId: 1,
        email: 1,
        firstName: 1,
        lastName: 1,
        role: 1,
        isAdmin: 1,
        isActive: 1,
        lastLoginAt: 1,
        createdAt: 1
      })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({
      users: users.map(user => ({
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isAdmin: user.isAdmin,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        hasCompletedSignup: !!user.clerkId
      }))
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}