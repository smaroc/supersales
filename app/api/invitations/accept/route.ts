import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { Invitation, User, COLLECTIONS } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    const { db } = await connectToDatabase()

    // Find invitation by token
    const invitation = await db.collection<Invitation>(COLLECTIONS.INVITATIONS).findOne({
      token,
      status: 'pending'
    })

    if (!invitation) {
      // Invitation not found or already used - redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Check if invitation has expired
    const now = new Date()
    if (invitation.expiresAt < now) {
      await db.collection<Invitation>(COLLECTIONS.INVITATIONS).updateOne(
        { token },
        {
          $set: {
            status: 'expired',
            updatedAt: new Date()
          }
        }
      )
      return NextResponse.redirect(new URL('/dashboard?error=invitation_expired', request.url))
    }

    // Get user's email from Clerk
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const userEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )?.emailAddress

    // Verify email matches invitation
    if (!userEmail || userEmail.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.redirect(
        new URL('/dashboard?error=email_mismatch', request.url)
      )
    }

    // Find existing user in MongoDB by email (created during invitation)
    const existingUser = await db.collection<User>(COLLECTIONS.USERS).findOne({
      email: invitation.email.toLowerCase()
    })

    if (existingUser) {
      // Update user with Clerk ID if not already set
      if (existingUser.clerkId !== userId) {
        await db.collection<User>(COLLECTIONS.USERS).updateOne(
          { _id: existingUser._id },
          {
            $set: {
              clerkId: userId,
              isActive: true,
              hasCompletedSignup: true,
              lastLoginAt: new Date(),
              updatedAt: new Date()
            }
          }
        )
      }
    }

    // Mark invitation as accepted
    await db.collection<Invitation>(COLLECTIONS.INVITATIONS).updateOne(
      { _id: invitation._id },
      {
        $set: {
          status: 'accepted',
          acceptedAt: new Date(),
          updatedAt: new Date()
        }
      }
    )

    console.log(`✅ Invitation accepted for ${invitation.email} (billingMode: ${invitation.billingMode})`)

    // Redirect based on billing mode
    if (invitation.billingMode === 'team') {
      // Team billing: user already has access, go directly to dashboard
      return NextResponse.redirect(new URL('/dashboard?invitation_accepted=true&billing=team', request.url))
    } else {
      // Individual billing: user needs to subscribe
      return NextResponse.redirect(new URL(`/checkout?invitation_token=${token}`, request.url))
    }

  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.redirect(
      new URL('/dashboard?error=invitation_processing_failed', request.url)
    )
  }
}
