import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import connectToDatabase from '@/lib/mongodb'
import { User, TeamSubscription, COLLECTIONS } from '@/lib/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
})

export async function POST() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { db } = await connectToDatabase()

    // Get current user
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({
      clerkId: userId
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Only HoS, admins, and owners can create team subscriptions
    if (!currentUser.isAdmin && !['admin', 'owner', 'head_of_sales'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Only Head of Sales, admins, and owners can create team subscriptions' },
        { status: 403 }
      )
    }

    // Check if user already has an active team subscription
    const existingTeamSub = await db.collection<TeamSubscription>(COLLECTIONS.TEAM_SUBSCRIPTIONS).findOne({
      ownerId: currentUser._id,
      isActive: true
    })

    if (existingTeamSub) {
      return NextResponse.json(
        { error: 'You already have an active team subscription' },
        { status: 400 }
      )
    }

    // Ensure user has a Stripe customer ID
    let customerId = currentUser.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: currentUser.email,
        name: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
        metadata: {
          clerkUserId: userId,
          type: 'team_subscription_owner'
        },
      })
      customerId = customer.id

      await db.collection<User>(COLLECTIONS.USERS).updateOne(
        { _id: currentUser._id },
        {
          $set: {
            stripeCustomerId: customerId,
            updatedAt: new Date()
          }
        }
      )
    }

    const teamSeatPriceId = process.env.NEXT_PUBLIC_STRIPE_TEAM_SEAT_PRICE

    if (!teamSeatPriceId) {
      return NextResponse.json(
        { error: 'Team seat price not configured' },
        { status: 500 }
      )
    }

    // Create subscription with quantity 0 (will be updated when adding seats)
    // Stripe requires at least quantity: 1, so we create with 1 seat initially
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: teamSeatPriceId,
          quantity: 1,
        },
      ],
      metadata: {
        clerkUserId: userId,
        type: 'team_subscription',
        ownerId: currentUser._id!.toString(),
      },
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    })

    // Create team subscription record
    // Cast subscription to access current_period_end
    const subData = subscription as unknown as { current_period_end: number; id: string; status: string }
    const teamSubscription: Omit<TeamSubscription, '_id'> = {
      organizationId: currentUser.organizationId,
      ownerId: currentUser._id!,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subData.id,
      stripePriceId: teamSeatPriceId,
      stripeCurrentPeriodEnd: new Date(subData.current_period_end * 1000),
      seatCount: 1,
      isActive: subData.status === 'active' || subData.status === 'trialing',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.collection<TeamSubscription>(COLLECTIONS.TEAM_SUBSCRIPTIONS).insertOne(teamSubscription)

    // Get client secret for payment
    const invoice = subscription.latest_invoice as unknown as { payment_intent?: { client_secret?: string } }
    const clientSecret = invoice?.payment_intent?.client_secret

    return NextResponse.json({
      subscriptionId: subData.id,
      clientSecret: clientSecret,
      status: subData.status
    })
  } catch (error) {
    console.error('Error creating team subscription:', error)
    return NextResponse.json(
      { error: 'Failed to create team subscription' },
      { status: 500 }
    )
  }
}
