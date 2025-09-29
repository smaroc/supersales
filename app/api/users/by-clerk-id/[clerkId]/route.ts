import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/mongodb'
import { User, Organization, COLLECTIONS } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clerkId: string }> }
) {
  try {
    const resolvedParams = await params
    const { db } = await connectToDatabase()

    const user = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: resolvedParams.clerkId })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
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
    console.error('Error fetching user by Clerk ID:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}