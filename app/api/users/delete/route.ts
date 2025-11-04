import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
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
      return NextResponse.json({ error: 'Only admins can delete users' }, { status: 403 })
    }

    const body = await request.json()
    const { userIdToDelete } = body

    if (!userIdToDelete) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Find the user to delete
    const userToDelete = await db.collection<User>(COLLECTIONS.USERS).findOne({
      _id: new ObjectId(userIdToDelete)
    })

    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deleting users from other organizations
    if (userToDelete.organizationId.toString() !== currentUser.organizationId.toString()) {
      return NextResponse.json({ error: 'Cannot delete users from other organizations' }, { status: 403 })
    }

    // Prevent self-deletion
    if (userToDelete._id?.toString() === currentUser._id?.toString()) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
    }

    // Prevent deleting super admins
    if (userToDelete.isSuperAdmin && !currentUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Cannot delete super admins' }, { status: 403 })
    }

    // Soft delete in database - mark as deleted
    await db.collection<User>(COLLECTIONS.USERS).updateOne(
      { _id: userToDelete._id },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: currentUser._id,
          isActive: false,
          updatedAt: new Date()
        }
      }
    )

    // Delete from Clerk if user has a Clerk account
    if (userToDelete.clerkId) {
      try {
        const client = await clerkClient()
        await client.users.deleteUser(userToDelete.clerkId)
        console.log(`✅ User deleted from Clerk: ${userToDelete.clerkId}`)
      } catch (clerkError: any) {
        // Log error but continue - user might not exist in Clerk
        console.error('Error deleting user from Clerk:', clerkError?.message || clerkError)

        // If user doesn't exist in Clerk, that's fine
        if (clerkError?.status === 404 || clerkError?.errors?.[0]?.code === 'resource_not_found') {
          console.log('User not found in Clerk, continuing...')
        }
      }
    }

    console.log(`🗑️ User soft-deleted: ${userToDelete.email} by ${currentUser.email}`)

    return NextResponse.json({
      message: 'User deleted successfully',
      user: {
        id: userToDelete._id,
        email: userToDelete.email,
        firstName: userToDelete.firstName,
        lastName: userToDelete.lastName
      }
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
