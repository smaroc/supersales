import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { User, Integration, SystemConfig, COLLECTIONS } from '@/lib/types'
import { Fathom } from 'fathom-typescript'
import { MongoDBTokenStore } from '@/lib/fathom-token-store'
import { decrypt } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  console.log('[fathom-oauth-callback] Processing OAuth callback...')

  try {
    // Get callback parameters
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    console.log('[fathom-oauth-callback] Callback params:', { code: !!code, state: !!state, error })

    // Handle authorization errors
    if (error) {
      console.error('[fathom-oauth-callback] Authorization error:', error)
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=oauth_denied&message=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code || !state) {
      console.error('[fathom-oauth-callback] Missing code or state')
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=oauth_invalid&message=Missing+authorization+code', request.url)
      )
    }

    // Verify state and extract userId
    let stateData: { userId: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
      console.log('[fathom-oauth-callback] State verified, userId:', stateData.userId)
    } catch (e) {
      console.error('[fathom-oauth-callback] Invalid state parameter')
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=oauth_invalid&message=Invalid+state+parameter', request.url)
      )
    }

    // Verify current user matches state
    const { userId } = await auth()
    if (!userId || userId !== stateData.userId) {
      console.error('[fathom-oauth-callback] User mismatch')
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=oauth_invalid&message=User+mismatch', request.url)
      )
    }

    console.log('[fathom-oauth-callback] User authenticated:', userId)

    // Get user from database
    const { db } = await connectToDatabase()
    const user = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })

    if (!user) {
      console.error('[fathom-oauth-callback] User not found in database')
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=user_not_found', request.url)
      )
    }

    console.log('[fathom-oauth-callback] User found:', user.email || user.clerkId)

    // Get OAuth credentials from database (multi-tenant setup)
    const systemConfig = await db.collection<SystemConfig>(COLLECTIONS.SYSTEM_CONFIGS).findOne({
      key: 'fathom_oauth_app',
      isActive: true
    })

    if (!systemConfig?.config?.clientId || !systemConfig?.config?.clientSecret || !systemConfig?.config?.redirectUri) {
      console.error('[fathom-oauth-callback] OAuth app not configured in database')
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=oauth_config&message=OAuth+not+configured+in+database', request.url)
      )
    }

    console.log('[fathom-oauth-callback] Using OAuth config from database')
    const clientId = decrypt(systemConfig.config.clientId)
    const clientSecret = decrypt(systemConfig.config.clientSecret)
    const redirectUri = systemConfig.config.redirectUri

    console.log('[fathom-oauth-callback] OAuth config loaded')

    // Create or update integration record first
    const baseUrl = request.nextUrl.origin
    const webhookUrl = `${baseUrl}/api/webhooks/fathom/${userId}`

    await db.collection<Integration>(COLLECTIONS.INTEGRATIONS).updateOne(
      {
        userId: user._id,
        platform: 'fathom'
      },
      {
        $set: {
          userId: user._id,
          organizationId: user.organizationId,
          platform: 'fathom',
          webhookUrl,
          isActive: true,
          syncStatus: 'idle',
          updatedAt: new Date(),
          configuration: {} // Will be populated by token store
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    )

    console.log('[fathom-oauth-callback] Integration record created/updated')

    // Initialize token store
    const tokenStore = new MongoDBTokenStore(user._id)

    console.log('[fathom-oauth-callback] Exchanging code for tokens...')

    // Initialize Fathom SDK with OAuth
    const fathom = new Fathom({
      security: Fathom.withAuthorization({
        clientId,
        clientSecret,
        code,
        redirectUri,
        tokenStore
      })
    })

    console.log('[fathom-oauth-callback] Fathom SDK initialized with OAuth')

    // Test the connection by calling an API
    console.log('[fathom-oauth-callback] Testing connection...')
    const meetingsResult = await fathom.listMeetings({})

    // Get first page to verify connection
    for await (const page of meetingsResult) {
      if (page) {
        console.log('[fathom-oauth-callback] Connection successful! Meetings found:', page.result?.items?.length || 0)
        break // Just need to verify first page
      }
    }

    // Create webhook automatically
    console.log('[fathom-oauth-callback] Creating webhook...')
    let webhookId: string | undefined
    try {
      const webhook = await fathom.createWebhook({
        destinationUrl: webhookUrl,
        includeTranscript: true,
        includeActionItems: true,
        includeSummary: true,
        includeCrmMatches: false,
        triggeredFor: ['my_recordings', 'shared_external_recordings']
      })

      if (webhook) {
        webhookId = webhook.id
        console.log('[fathom-oauth-callback] Webhook created:', webhookId)

        // Store webhook ID and secret
        await db.collection<Integration>(COLLECTIONS.INTEGRATIONS).updateOne(
          {
            userId: user._id,
            platform: 'fathom'
          },
          {
            $set: {
              webhookId: webhook.id,
              'configuration.webhookSecret': webhook.secret || '',
              updatedAt: new Date()
            }
          }
        )
      }
    } catch (error: any) {
      console.error('[fathom-oauth-callback] Failed to create webhook:', error.message)
      // Continue anyway - user can create webhook manually
    }

    console.log('[fathom-oauth-callback] OAuth flow completed successfully')

    // Redirect back to settings with success message
    return NextResponse.redirect(
      new URL(`/dashboard/settings?success=fathom_connected&webhookId=${webhookId || 'none'}`, request.url)
    )
  } catch (error: any) {
    console.error('[fathom-oauth-callback] Error in OAuth callback:', error)
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=oauth_failed&message=${encodeURIComponent(error.message)}`, request.url)
    )
  }
}
