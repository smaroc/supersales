import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
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

    // Check if user is admin or owner
    if (!['admin', 'owner'].includes(currentUser.role)) {
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

    // Find the user and ensure it belongs to the same organization
    const user = await db.collection<User>(COLLECTIONS.USERS).findOne({
      _id: new ObjectId(resolvedParams.id),
      organizationId: currentUser.organizationId
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent users from changing their own role to a lower privilege
    if (user._id?.toString() === currentUser._id?.toString() &&
        ['admin', 'owner'].includes(user.role) &&
        !['admin', 'owner'].includes(role)) {
      return NextResponse.json(
        { error: 'You cannot demote yourself' },
        { status: 403 }
      )
    }

    // Only owners can modify other owners or assign owner role
    if ((user.role === 'owner' || role === 'owner') && currentUser.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can modify owner accounts' },
        { status: 403 }
      )
    }

    // Check if email is already used by another user
    if (email.toLowerCase() !== user.email) {
      const existingUser = await db.collection<User>(COLLECTIONS.USERS).findOne({
        email: email.toLowerCase(),
        _id: { $ne: new ObjectId(resolvedParams.id) }
      })
      if (existingUser) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 400 }
        )
      }
    }

    // Update user
    const updatedUser = await db.collection<User>(COLLECTIONS.USERS).findOneAndUpdate(
      { _id: new ObjectId(resolvedParams.id) },
      {
        $set: {
          email: email.toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          isActive: isActive !== undefined ? isActive : user.isActive,
          permissions: permissions || user.permissions,
          updatedAt: new Date()
        }
      },
      {
        returnDocument: 'after',
        projection: {
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

    return NextResponse.json(JSON.parse(JSON.stringify(updatedUser)))
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
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

    // Only super admins can update admin permissions
    if (!currentUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions. Super admin access required.' }, { status: 403 })
    }

    const body = await request.json()
    const { isAdmin, isSuperAdmin } = body

    if (typeof isAdmin !== 'boolean' && typeof isSuperAdmin !== 'boolean') {
      return NextResponse.json(
        { error: 'At least one of isAdmin or isSuperAdmin must be provided' },
        { status: 400 }
      )
    }

    // Find the user
    const user = await db.collection<User>(COLLECTIONS.USERS).findOne({
      _id: new ObjectId(resolvedParams.id)
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent users from modifying their own permissions
    if (user._id?.toString() === currentUser._id?.toString()) {
      return NextResponse.json(
        { error: 'You cannot modify your own permissions' },
        { status: 403 }
      )
    }

    const updateData: any = {
      updatedAt: new Date()
    }

    if (typeof isAdmin === 'boolean') {
      updateData.isAdmin = isAdmin
    }

    if (typeof isSuperAdmin === 'boolean') {
      updateData.isSuperAdmin = isSuperAdmin
    }

    // Update user permissions
    const updatedUser = await db.collection<User>(COLLECTIONS.USERS).findOneAndUpdate(
      { _id: new ObjectId(resolvedParams.id) },
      { $set: updateData },
      {
        returnDocument: 'after',
        projection: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          role: 1,
          isAdmin: 1,
          isSuperAdmin: 1,
          isActive: 1,
          organizationId: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    )

    console.log(`Super admin ${currentUser.email} updated permissions for user ${user.email}`)

    return NextResponse.json({
      success: true,
      user: JSON.parse(JSON.stringify(updatedUser))
    })
  } catch (error) {
    console.error('Error updating user permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
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

    // Check if user is admin or owner
    if (!['admin', 'owner'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Find the user and ensure it belongs to the same organization
    const user = await db.collection<User>(COLLECTIONS.USERS).findOne({
      _id: new ObjectId(resolvedParams.id),
      organizationId: currentUser.organizationId
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent users from deleting themselves
    if (user._id?.toString() === currentUser._id?.toString()) {
      return NextResponse.json(
        { error: 'You cannot delete yourself' },
        { status: 403 }
      )
    }

    // Only owners can delete other owners
    if (user.role === 'owner' && currentUser.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can delete owner accounts' },
        { status: 403 }
      )
    }

    // Permanent delete - remove user from database
    const deleteResult = await db.collection<User>(COLLECTIONS.USERS).deleteOne({
      _id: new ObjectId(resolvedParams.id)
    })

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'User permanently deleted from database' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}