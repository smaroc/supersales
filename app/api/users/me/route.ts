import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { User, COLLECTIONS } from '@/lib/types'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }


    console.log(`${userId} is fetching their profile`)


    const { db } = await connectToDatabase()

    const user = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        organizationId: user.organizationId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        isActive: user.isActive,
        avatar: user.avatar,
        permissions: user.permissions
      }
    })

  } catch (error) {
    console.error('Error fetching current user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`${userId} is updating their profile`)

    const { firstName, lastName } = await request.json()

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    const updateResult = await db.collection<User>(COLLECTIONS.USERS).updateOne(
      { clerkId: userId },
      {
        $set: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          updatedAt: new Date()
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updatedUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })

    return NextResponse.json({
      user: {
        id: updatedUser!._id,
        email: updatedUser!.email,
        firstName: updatedUser!.firstName,
        lastName: updatedUser!.lastName,
        role: updatedUser!.role,
        isAdmin: updatedUser!.isAdmin,
        isActive: updatedUser!.isActive,
        avatar: updatedUser!.avatar,
        organizationId: updatedUser!.organizationId,
        permissions: updatedUser!.permissions,
        createdAt: updatedUser!.createdAt,
        updatedAt: updatedUser!.updatedAt
      }
    })

  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}