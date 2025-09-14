import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    await dbConnect()

    // Find the user and ensure it belongs to the same organization
    const user = await User.findOne({
      _id: params.id,
      organizationId: session.user.organizationId
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent users from changing their own role to a lower privilege
    if (user._id.toString() === session.user.id && 
        ['admin', 'owner'].includes(user.role) && 
        !['admin', 'owner'].includes(role)) {
      return NextResponse.json(
        { error: 'You cannot demote yourself' },
        { status: 403 }
      )
    }

    // Only owners can modify other owners or assign owner role
    if ((user.role === 'owner' || role === 'owner') && session.user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can modify owner accounts' },
        { status: 403 }
      )
    }

    // Check if email is already used by another user
    if (email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: params.id }
      })
      if (existingUser) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 400 }
        )
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      params.id,
      {
        email: email.toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        isActive: isActive !== undefined ? isActive : user.isActive,
        permissions: permissions || user.permissions
      },
      { new: true }
    ).select('firstName lastName email role isActive lastLoginAt createdAt permissions')

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user:', error)
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

    // Check if user is admin or owner
    if (!['admin', 'owner'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    await dbConnect()

    // Find the user and ensure it belongs to the same organization
    const user = await User.findOne({
      _id: params.id,
      organizationId: session.user.organizationId
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent users from deleting themselves
    if (user._id.toString() === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot delete yourself' },
        { status: 403 }
      )
    }

    // Only owners can delete other owners
    if (user.role === 'owner' && session.user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can delete owner accounts' },
        { status: 403 }
      )
    }

    // Soft delete by marking as inactive instead of hard delete
    // This preserves data integrity for historical records
    await User.findByIdAndUpdate(params.id, { 
      isActive: false,
      email: `deleted_${Date.now()}_${user.email}` // Prevent email conflicts
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}