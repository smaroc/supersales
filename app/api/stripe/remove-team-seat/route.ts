import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import connectToDatabase from '@/lib/mongodb'
import { User, TeamSubscription, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
})

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { db } = await connectToDatabase()

    // Get current user (the HoS/admin removing the seat)
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({
      clerkId: userId
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get team subscription
    const teamSubscription = await db.collection<TeamSubscription>(COLLECTIONS.TEAM_SUBSCRIPTIONS).findOne({
      ownerId: currentUser._id,
      isActive: true
    })

    if (!teamSubscription) {
      return NextResponse.json(
        { error: 'No active team subscription found' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { odUserId } = body

    if (!odUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get the user to remove from team seats
    const targetUser = await db.collection<User>(COLLECTIONS.USERS).findOne({
      _id: new ObjectId(odUserId)
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Verify user is actually on this team subscription
    if (targetUser.billingType !== 'team' || targetUser.paidByUserId?.toString() !== currentUser._id?.toString()) {
      return NextResponse.json(
        { error: 'User is not on your team subscription' },
        { status: 400 }
      )
    }

    // Update Stripe subscription quantity (minimum 1 seat)
    const newSeatCount = Math.max(1, teamSubscription.seatCount - 1)

    if (teamSubscription.seatCount > 1) {
      const subscription = await stripe.subscriptions.retrieve(teamSubscription.stripeSubscriptionId)
      const subscriptionItem = subscription.items.data[0]

      await stripe.subscriptions.update(teamSubscription.stripeSubscriptionId, {
        items: [
          {
            id: subscriptionItem.id,
            quantity: newSeatCount,
          },
        ],
        proration_behavior: 'create_prorations',
      })
    }

    // Update team subscription seat count
    await db.collection<TeamSubscription>(COLLECTIONS.TEAM_SUBSCRIPTIONS).updateOne(
      { _id: teamSubscription._id },
      {
        $set: {
          seatCount: newSeatCount,
          updatedAt: new Date()
        }
      }
    )

    // Remove team billing info from user and revoke access
    await db.collection<User>(COLLECTIONS.USERS).updateOne(
      { _id: targetUser._id },
      {
        $set: {
          hasAccess: false,
          billingType: 'individual',
          updatedAt: new Date()
        },
        $unset: {
          paidByUserId: '',
          teamSeatAssignedAt: ''
        }
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Team seat removed successfully. User can now subscribe individually.',
      newSeatCount
    })
  } catch (error) {
    console.error('Error removing team seat:', error)
    return NextResponse.json(
      { error: 'Failed to remove team seat' },
      { status: 500 }
    )
  }
}
