import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import connectToDatabase from '@/lib/mongodb'
import { User, TeamSubscription, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { db } = await connectToDatabase()

    // Get current user (the HoS/admin adding the seat)
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
        { error: 'No active team subscription found. Please create one first.' },
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

    // Get the user to add as a team seat
    const targetUser = await db.collection<User>(COLLECTIONS.USERS).findOne({
      _id: new ObjectId(odUserId)
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Verify target user is in the same organization
    if (targetUser.organizationId.toString() !== currentUser.organizationId.toString()) {
      return NextResponse.json(
        { error: 'User is not in your organization' },
        { status: 403 }
      )
    }

    // Check if user is already a team seat
    if (targetUser.billingType === 'team' && targetUser.paidByUserId) {
      return NextResponse.json(
        { error: 'User is already on a team subscription' },
        { status: 400 }
      )
    }

    // Check if user already has individual access
    if (targetUser.hasAccess && targetUser.billingType === 'individual') {
      return NextResponse.json(
        { error: 'User already has an individual subscription' },
        { status: 400 }
      )
    }

    // Update Stripe subscription quantity
    const subscription = await stripe.subscriptions.retrieve(teamSubscription.stripeSubscriptionId)
    const subscriptionItem = subscription.items.data[0]

    await stripe.subscriptions.update(teamSubscription.stripeSubscriptionId, {
      items: [
        {
          id: subscriptionItem.id,
          quantity: teamSubscription.seatCount + 1,
        },
      ],
      proration_behavior: 'create_prorations',
    })

    // Update team subscription seat count
    await db.collection<TeamSubscription>(COLLECTIONS.TEAM_SUBSCRIPTIONS).updateOne(
      { _id: teamSubscription._id },
      {
        $set: {
          seatCount: teamSubscription.seatCount + 1,
          updatedAt: new Date()
        }
      }
    )

    // Update user with team billing info and grant access
    await db.collection<User>(COLLECTIONS.USERS).updateOne(
      { _id: targetUser._id },
      {
        $set: {
          hasAccess: true,
          billingType: 'team',
          paidByUserId: currentUser._id,
          teamSeatAssignedAt: new Date(),
          updatedAt: new Date()
        }
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Team seat added successfully',
      newSeatCount: teamSubscription.seatCount + 1
    })
  } catch (error) {
    console.error('Error adding team seat:', error)
    return NextResponse.json(
      { error: 'Failed to add team seat' },
      { status: 500 }
    )
  }
}
