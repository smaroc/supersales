import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { Resend } from 'resend'
import connectToDatabase from '@/lib/mongodb'
import { User, COLLECTIONS } from '@/lib/types'

const resend = new Resend(process.env.RESEND_API_KEY)

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
        await resend.emails.send({
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

        await updateUserSubscriptionByStripeId(customerId, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          stripeCurrentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
          hasAccess: subscription.status === 'active' || subscription.status === 'trialing',
        })

        console.log(`Subscription updated for customer: ${customerId}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription & { current_period_end?: number }
        const customerId = subscription.customer as string
        const subscriptionItem = subscription.items?.data?.[0] as Stripe.SubscriptionItem & { current_period_end?: number }
        const currentPeriodEnd = subscriptionItem?.current_period_end

        await updateUserSubscriptionByStripeId(customerId, {
          hasAccess: false,
          stripeCurrentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
        })

        console.log('Subscription deleted for customer:', customerId)
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
