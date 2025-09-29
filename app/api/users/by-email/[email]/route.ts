import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { User, Organization, COLLECTIONS } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const resolvedParams = await params
    // Verify authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { db } = await connectToDatabase()

    // Get current user to verify permissions
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 })
    }

    // Decode the email parameter (in case it was URL encoded)
    const email = decodeURIComponent(resolvedParams.email).toLowerCase()

    // Find user by email within the same organization
    const user = await db.collection<User>(COLLECTIONS.USERS).findOne({
      email: email,
      organizationId: currentUser.organizationId // Security: only within same org
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check permissions - only admins or the user themselves can access
    const isAdmin = currentUser.isAdmin || ['admin', 'owner'].includes(currentUser.role)
    const isSelf = currentUser.clerkId === user.clerkId

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get organization data
    const organization = await db.collection<Organization>(COLLECTIONS.ORGANIZATIONS)
      .findOne({ _id: user.organizationId })

    // Return user with populated organization
    const userWithOrg = {
      ...user,
      organizationId: organization
    }

    return NextResponse.json(userWithOrg)
  } catch (error) {
    console.error('Error fetching user by email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}