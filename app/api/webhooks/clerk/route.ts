import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import connectToDatabase from '@/lib/mongodb'
import { User, Invitation, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    // Get the headers
    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json(
        { error: 'Missing svix headers' },
        { status: 400 }
      )
    }

    // Get the body
    const payload = await request.json()
    const body = JSON.stringify(payload)

    // Create a new Svix instance with your webhook secret
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '')

    let evt: any

    // Verify the webhook
    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as any
    } catch (err) {
      console.error('Error verifying webhook:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle the webhook
    const eventType = evt.type
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    console.log(`Clerk webhook received: ${eventType}`)

    if (eventType === 'user.created') {
      const { db } = await connectToDatabase()
      const primaryEmail = email_addresses[0]?.email_address

      if (!primaryEmail) {
        console.error('No email found in Clerk user data')
        return NextResponse.json({ error: 'No email found' }, { status: 400 })
      }

      // Find user by email (created during invitation)
      const existingUser = await db.collection<User>(COLLECTIONS.USERS).findOne({
        email: primaryEmail.toLowerCase()
      })

      if (existingUser) {
        // Update existing user with Clerk ID and activate
        // Note: Invitation acceptance is handled by /api/invitations/accept route
        await db.collection<User>(COLLECTIONS.USERS).updateOne(
          { _id: existingUser._id },
          {
            $set: {
              clerkId: id,
              firstName: first_name || existingUser.firstName,
              lastName: last_name || existingUser.lastName,
              avatar: image_url || existingUser.avatar,
              isActive: true,
              lastLoginAt: new Date(),
              updatedAt: new Date()
            }
          }
        )

        console.log(`✅ User ${primaryEmail} linked to Clerk ID ${id} and activated`)
      } else {
        // This is a new user signing up without invitation
        // You can decide what to do here - create a new user or reject
        console.log(`⚠️ User ${primaryEmail} signed up without invitation`)

        // Optional: Create a basic user record
        // For now, we'll just log it and let the middleware handle it
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing Clerk webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
