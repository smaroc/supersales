import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import connectToDatabase from '@/lib/mongodb'
import { User, COLLECTIONS } from '@/lib/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
})

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { db } = await connectToDatabase()

    // Check if user already has an active subscription
    const dbUser = await db.collection<User>(COLLECTIONS.USERS).findOne({
      clerkId: userId
    })

    // If user already has access, redirect to dashboard
    if (dbUser?.hasAccess) {
      return NextResponse.json(
        { error: 'User already has access' },
        { status: 400 }
      )
    }

    // Check if user already has a Stripe customer ID
    let customerId = dbUser?.stripeCustomerId

    if (!customerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        metadata: {
          clerkUserId: userId,
        },
      })
      customerId = customer.id

      // Update user with Stripe customer ID
      await db.collection<User>(COLLECTIONS.USERS).updateOne(
        { clerkId: userId },
        {
          $set: {
            stripeCustomerId: customerId,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      )
    }

    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID not configured' },
        { status: 500 }
      )
    }

    // Get origin for redirect URLs
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/checkout?canceled=true`,
      metadata: {
        clerkUserId: userId,
      },
      subscription_data: {
        metadata: {
          clerkUserId: userId,
        },
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
