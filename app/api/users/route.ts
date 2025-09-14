import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or owner
    if (!['admin', 'owner'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    await dbConnect()

    const users = await User.find({
      organizationId: session.user.organizationId
    })
    .select('firstName lastName email role isActive lastLoginAt createdAt permissions')
    .sort({ createdAt: -1 })
    .lean()

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
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or owner
    if (!['admin', 'owner'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { email, firstName, lastName, role, isActive, permissions } = body

    if (!email || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Email, firstName, lastName, and role are required' },
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
    if (role === 'owner' && session.user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can create other owners' },
        { status: 403 }
      )
    }

    await dbConnect()

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Create new user
    const newUser = new User({
      organizationId: session.user.organizationId,
      email: email.toLowerCase(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      isActive: isActive !== undefined ? isActive : true,
      permissions: permissions || {
        canViewAllData: false,
        canManageUsers: false,
        canManageSettings: false,
        canExportData: false,
        canDeleteData: false
      },
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
      }
    })

    await newUser.save()

    // Return the created user without sensitive information
    const createdUser = await User.findById(newUser._id)
      .select('firstName lastName email role isActive lastLoginAt createdAt permissions')
      .lean()

    return NextResponse.json(createdUser, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}