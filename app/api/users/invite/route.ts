import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Only admins can invite users' }, { status: 403 })
    }

    const body = await request.json()
    const { email, firstName, lastName, role = 'viewer' } = body

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, first name, and last name are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db.collection<User>(COLLECTIONS.USERS).findOne({
      email: email.toLowerCase()
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Create invited user record (they'll complete signup with Clerk)
    const invitedUser: Omit<User, '_id'> = {
      clerkId: '', // Will be set when they complete Clerk signup
      organizationId: currentUser.organizationId,
      email: email.toLowerCase(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: role,
      isAdmin: role === 'admin' || role === 'owner',
      isSuperAdmin: false, // Default to false for invited users
      isActive: false, // Will be activated when they complete signup
      permissions: {
        canViewAllData: ['admin', 'owner', 'head_of_sales'].includes(role),
        canManageUsers: ['admin', 'owner'].includes(role),
        canManageSettings: ['admin', 'owner'].includes(role),
        canExportData: ['admin', 'owner', 'head_of_sales', 'manager'].includes(role),
        canDeleteData: ['admin', 'owner'].includes(role)
      },
      preferences: {
        theme: 'system',
        notifications: {
          email: true,
          inApp: true,
          callSummaries: true,
          weeklyReports: false
        },
        dashboard: {
          defaultView: 'overview',
          refreshInterval: 300
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection<User>(COLLECTIONS.USERS).insertOne(invitedUser)
    const savedUser = await db.collection<User>(COLLECTIONS.USERS)
      .findOne({ _id: result.insertedId })

    // TODO: Send invitation email here (integrate with your email service)
    console.log(`User invited: ${email} by ${currentUser.email}`)

    return NextResponse.json({
      message: 'User invited successfully',
      user: {
        id: savedUser?._id,
        email: savedUser?.email,
        firstName: savedUser?.firstName,
        lastName: savedUser?.lastName,
        role: savedUser?.role,
        isActive: savedUser?.isActive
      }
    })

  } catch (error) {
    console.error('Error inviting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}