import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { db } = await connectToDatabase()

    // Get current user data to check permissions and organization
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is admin or owner
    if (!['admin', 'owner'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const users = await db.collection<User>(COLLECTIONS.USERS)
      .find(
        { organizationId: currentUser.organizationId },
        {
          projection: {
            clerkId: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            role: 1,
            isActive: 1,
            lastLoginAt: 1,
            createdAt: 1,
            permissions: 1
          }
        }
      )
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
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

    const { db } = await connectToDatabase()

    // Get current user data to check permissions and organization
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is admin or owner
    if (!['admin', 'owner'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { clerkId, email, firstName, lastName, role, isActive, permissions } = body

    if (!clerkId || !email || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'clerkId, email, firstName, lastName, and role are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Only owners can create other owners
    if (role === 'owner' && currentUser.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can create other owners' },
        { status: 403 }
      )
    }

    // Check if user with this email or clerkId already exists
    const existingUser = await db.collection<User>(COLLECTIONS.USERS).findOne({
      $or: [
        { email: email.toLowerCase() },
        { clerkId: clerkId }
      ]
    })
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email or Clerk ID already exists' },
        { status: 400 }
      )
    }

    // Set role-based permissions
    let rolePermissions = {
      canViewAllData: false,
      canManageUsers: false,
      canManageSettings: false,
      canExportData: false,
      canDeleteData: false
    }

    switch (role) {
      case 'owner':
      case 'admin':
        rolePermissions = {
          canViewAllData: true,
          canManageUsers: true,
          canManageSettings: true,
          canExportData: true,
          canDeleteData: true
        }
        break
      case 'manager':
        rolePermissions = {
          canViewAllData: true,
          canManageUsers: false,
          canManageSettings: false,
          canExportData: true,
          canDeleteData: false
        }
        break
      case 'head_of_sales':
        rolePermissions = {
          canViewAllData: true,
          canManageUsers: true,
          canManageSettings: true,
          canExportData: true,
          canDeleteData: false
        }
        break
      case 'sales_rep':
        rolePermissions = {
          canViewAllData: false,
          canManageUsers: false,
          canManageSettings: false,
          canExportData: false,
          canDeleteData: false
        }
        break
      case 'viewer':
        rolePermissions = {
          canViewAllData: true,
          canManageUsers: false,
          canManageSettings: false,
          canExportData: false,
          canDeleteData: false
        }
        break
    }

    // Create new user
    const newUser: User = {
      clerkId,
      organizationId: currentUser.organizationId,
      email: email.toLowerCase(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      isAdmin: false,
      isActive: isActive !== undefined ? isActive : true,
      permissions: permissions || rolePermissions,
      preferences: {
        theme: 'system',
        notifications: {
          email: true,
          inApp: true,
          callSummaries: true,
          weeklyReports: true
        },
        dashboard: {
          defaultView: 'overview',
          refreshInterval: 300
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection<User>(COLLECTIONS.USERS).insertOne(newUser)

    // Return the created user without sensitive information
    const createdUser = await db.collection<User>(COLLECTIONS.USERS).findOne(
      { _id: result.insertedId },
      {
        projection: {
          clerkId: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          role: 1,
          isActive: 1,
          lastLoginAt: 1,
          createdAt: 1,
          permissions: 1
        }
      }
    )

    return NextResponse.json(createdUser, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}