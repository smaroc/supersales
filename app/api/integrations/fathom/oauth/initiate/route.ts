import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Fathom } from 'fathom-typescript'
import connectToDatabase from '@/lib/mongodb'
import { SystemConfig, COLLECTIONS } from '@/lib/types'
import { decrypt } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  console.log('[fathom-oauth] Initiating OAuth flow...')

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      console.error('[fathom-oauth] Unauthorized - no user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[fathom-oauth] User authenticated:', userId)

    // Get OAuth credentials from database first, fallback to environment
    const { db } = await connectToDatabase()
    const systemConfig = await db.collection<SystemConfig>(COLLECTIONS.SYSTEM_CONFIGS).findOne({
      key: 'fathom_oauth_app',
      isActive: true
    })

    let clientId: string | undefined
    let clientSecret: string | undefined
    let redirectUri: string | undefined

    if (systemConfig?.config) {
      console.log('[fathom-oauth] Using OAuth config from database')
      clientId = systemConfig.config.clientId ? decrypt(systemConfig.config.clientId) : undefined
      clientSecret = systemConfig.config.clientSecret ? decrypt(systemConfig.config.clientSecret) : undefined
      redirectUri = systemConfig.config.redirectUri || undefined
    } else {
      console.log('[fathom-oauth] Using OAuth config from environment variables (fallback)')
      clientId = process.env.FATHOM_OAUTH_CLIENT_ID
      clientSecret = process.env.FATHOM_OAUTH_CLIENT_SECRET
      redirectUri = process.env.NEXT_PUBLIC_FATHOM_OAUTH_REDIRECT_URI
    }

    if (!clientId || !redirectUri) {
      console.error('[fathom-oauth] Missing OAuth configuration')
      return NextResponse.json(
        { error: 'Fathom OAuth not configured. Please contact your administrator to set up the Fathom OAuth app.' },
        { status: 500 }
      )
    }

    console.log('[fathom-oauth] OAuth config found')
    console.log('[fathom-oauth] Redirect URI:', redirectUri)

    // Generate state parameter (include userId for security)
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64')

    console.log('[fathom-oauth] Generated state:', state.substring(0, 20) + '...')

    // Generate authorization URL using Fathom SDK
    const authUrl = Fathom.getAuthorizationUrl({
      clientId,
      redirectUri,
      scope: 'public_api',
      state,
    })

    console.log('[fathom-oauth] Authorization URL generated')
    console.log('[fathom-oauth] Redirecting user to Fathom...')

    // Redirect user to Fathom authorization page
    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('[fathom-oauth] Error initiating OAuth:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initiate OAuth flow' },
      { status: 500 }
    )
  }
}
