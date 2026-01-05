import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { Resend } from 'resend'
import connectToDatabase from '@/lib/mongodb'
import { User, TeamSubscription, COLLECTIONS } from '@/lib/types'

const getResend = () => new Resend(process.env.RESEND_API_KEY)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
})

async function updateUserSubscriptionByStripeId(
  stripeCustomerId: string,
  data: Partial<Pick<User, 'hasAccess' | 'stripeCustomerId' | 'stripeSubscriptionId' | 'stripePriceId' | 'stripeCurrentPeriodEnd'>>
) {
  const { db } = await connectToDatabase()

  const customer = await stripe.customers.retrieve(stripeCustomerId)
  const customerEmail = (customer as Stripe.Customer).email

  if (!customerEmail) {
    console.error(`No email found for Stripe customer: ${stripeCustomerId}`)
    return { modifiedCount: 0 }
  }

  const result = await db.collection<User>(COLLECTIONS.USERS).updateOne(
    { email: customerEmail },
    {
      $set: {
        ...data,
        updatedAt: new Date()
      }
    }
  )

  return result
}

async function getUserByStripeCustomerId(stripeCustomerId: string) {
  const { db } = await connectToDatabase()
  return db.collection<User>(COLLECTIONS.USERS).findOne({ stripeCustomerId })
}

async function updateTeamSubscription(subscription: Stripe.Subscription) {
  const { db } = await connectToDatabase()
  const subscriptionItem = subscription.items.data[0]
  const quantity = subscriptionItem?.quantity || 0

  // Cast to access current_period_end
  const subData = subscription as unknown as { current_period_end: number; id: string; status: string }

  const result = await db.collection<TeamSubscription>(COLLECTIONS.TEAM_SUBSCRIPTIONS).updateOne(
    { stripeSubscriptionId: subData.id },
    {
      $set: {
        seatCount: quantity,
        isActive: subData.status === 'active' || subData.status === 'trialing',
        stripeCurrentPeriodEnd: new Date(subData.current_period_end * 1000),
        updatedAt: new Date()
      }
    }
  )

  return result
}

async function handleTeamSubscriptionDeleted(subscriptionId: string) {
  const { db } = await connectToDatabase()

  // Find team subscription
  const teamSub = await db.collection<TeamSubscription>(COLLECTIONS.TEAM_SUBSCRIPTIONS).findOne({
    stripeSubscriptionId: subscriptionId
  })

  if (teamSub) {
    // Revoke access for all users paid by this team subscription owner
    const revokeResult = await db.collection<User>(COLLECTIONS.USERS).updateMany(
      { paidByUserId: teamSub.ownerId, billingType: 'team' },
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

    // Mark team subscription as inactive
    await db.collection<TeamSubscription>(COLLECTIONS.TEAM_SUBSCRIPTIONS).updateOne(
      { _id: teamSub._id },
      {
        $set: {
          isActive: false,
          updatedAt: new Date()
        }
      }
    )

    console.log(`Team subscription ${subscriptionId} deleted. Revoked access for ${revokeResult.modifiedCount} team members.`)
    return revokeResult.modifiedCount
  }

  return 0
}

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE
  const TEAM_SEAT_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_TEAM_SEAT_PRICE

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string
        const clerkUserId = session.metadata?.clerkUserId

        if (clerkUserId && subscriptionId) {
          const { db } = await connectToDatabase()

          // Get subscription details with expanded items
          const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items.data.price']
          })
          const subscription = subscriptionResponse as unknown as Stripe.Subscription & { items: { data: Array<Stripe.SubscriptionItem & { current_period_end?: number }> } }
          const priceId = subscription.items.data[0]?.price?.id
          const subscriptionItem = subscription.items.data[0]
          const currentPeriodEnd = subscriptionItem?.current_period_end || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

          // Update user with Stripe info
          await db.collection<User>(COLLECTIONS.USERS).updateOne(
            { clerkId: clerkUserId },
            {
              $set: {
                hasAccess: true,
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                stripePriceId: priceId,
                stripeCurrentPeriodEnd: new Date(currentPeriodEnd * 1000),
                updatedAt: new Date()
              }
            }
          )

          console.log(`✅ Checkout completed for user ${clerkUserId}, subscription ${subscriptionId}`)
        }
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription & { current_period_end?: number }
        const customerId = subscription.customer as string
        const subscriptionItem = subscription.items?.data?.[0] as Stripe.SubscriptionItem & { current_period_end?: number }
        const priceId = subscriptionItem?.price?.id
        const currentPeriodEnd = subscriptionItem?.current_period_end

        await updateUserSubscriptionByStripeId(customerId, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          stripeCurrentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
          hasAccess: subscription.status === 'active' || subscription.status === 'trialing',
        })

        // Send notification email for new subscription
        const customer = await stripe.customers.retrieve(customerId)
        const customerEmail = (customer as Stripe.Customer).email
        await getResend().emails.send({
          from: 'SuperSales <noreply@mail.supersales.dev>',
          to: 'info@supersales.dev',
          subject: '🎉 Nouvel abonnement SuperSales',
          html: `
            <h2>Nouvel abonnement créé</h2>
            <p><strong>Client:</strong> ${customerEmail || 'Non renseigné'}</p>
            <p><strong>ID Stripe:</strong> ${customerId}</p>
            <p><strong>ID Abonnement:</strong> ${subscription.id}</p>
            <p><strong>Statut:</strong> ${subscription.status}</p>
          `,
        })

        console.log(`Subscription created for customer: ${customerId}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription & { current_period_end?: number }
        const customerId = subscription.customer as string
        const subscriptionItem = subscription.items?.data?.[0] as Stripe.SubscriptionItem & { current_period_end?: number }
        const priceId = subscriptionItem?.price?.id
        const currentPeriodEnd = subscriptionItem?.current_period_end

        // Check if this is a team subscription
        const isTeamSubscription = priceId === TEAM_SEAT_PRICE_ID

        if (isTeamSubscription) {
          // Update team subscription record
          await updateTeamSubscription(subscription)
          console.log(`Team subscription updated: ${subscription.id}`)
        } else {
          // Update individual user subscription
          await updateUserSubscriptionByStripeId(customerId, {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            stripeCurrentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
            hasAccess: subscription.status === 'active' || subscription.status === 'trialing',
          })
          console.log(`Individual subscription updated for customer: ${customerId}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription & { current_period_end?: number }
        const customerId = subscription.customer as string
        const subscriptionItem = subscription.items?.data?.[0] as Stripe.SubscriptionItem & { current_period_end?: number }
        const priceId = subscriptionItem?.price?.id
        const currentPeriodEnd = subscriptionItem?.current_period_end

        // Check if this is a team subscription
        const isTeamSubscription = priceId === TEAM_SEAT_PRICE_ID

        if (isTeamSubscription) {
          // Handle team subscription deletion - revoke access for all team members
          await handleTeamSubscriptionDeleted(subscription.id)
        } else {
          // Handle individual subscription deletion
          await updateUserSubscriptionByStripeId(customerId, {
            hasAccess: false,
            stripeCurrentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
          })
          console.log('Individual subscription deleted for customer:', customerId)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoiceData = event.data.object as unknown as { customer: string; subscription?: string }
        const customerId = invoiceData.customer
        const subscriptionId = invoiceData.subscription

        if (subscriptionId) {
          const user = await getUserByStripeCustomerId(customerId)

          if (user) {
            // Get subscription to update period end
            const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId)
            const subscription = subscriptionResponse as unknown as Stripe.Subscription & { items: { data: Array<Stripe.SubscriptionItem & { current_period_end?: number }> } }
            const subscriptionItem = subscription.items?.data?.[0]
            const currentPeriodEnd = subscriptionItem?.current_period_end

            await updateUserSubscriptionByStripeId(customerId, {
              hasAccess: true,
              stripeCurrentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
            })

            console.log(`Payment succeeded for customer: ${customerId}`)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoiceData = event.data.object as unknown as { customer: string }
        const customerId = invoiceData.customer

        await updateUserSubscriptionByStripeId(customerId, {
          hasAccess: false,
        })

        console.log('Payment failed for customer:', customerId)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
