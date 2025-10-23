import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { User, SystemConfig, COLLECTIONS } from '@/lib/types'
import { encrypt, decrypt } from '@/lib/encryption'

// GET - Retrieve OAuth configuration (super admin only)
export async function GET(request: NextRequest) {
  console.log('[oauth-config] GET - Fetching OAuth configuration')

  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    const user = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })

    if (!user?.isSuperAdmin) {
      console.error('[oauth-config] Access denied - user is not super admin')
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 })
    }

    const systemConfig = await db.collection<SystemConfig>(COLLECTIONS.SYSTEM_CONFIGS).findOne({
      key: 'fathom_oauth_app'
    })

    if (!systemConfig) {
      return NextResponse.json({ configured: false })
    }

    // Decrypt for display (mask secrets)
    const config = {
      configured: true,
      isActive: systemConfig.isActive,
      clientId: systemConfig.config.clientId ? decrypt(systemConfig.config.clientId) : '',
      clientSecret: systemConfig.config.clientSecret ? '••••••••' : '', // Masked
      redirectUri: systemConfig.config.redirectUri || '',
      createdBy: systemConfig.createdBy,
      createdAt: systemConfig.createdAt,
      updatedAt: systemConfig.updatedAt
    }

    return NextResponse.json(config)
  } catch (error: any) {
    console.error('[oauth-config] Error fetching configuration:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Save OAuth configuration (super admin only)
export async function POST(request: NextRequest) {
  console.log('[oauth-config] POST - Saving OAuth configuration')

  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    const user = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })

    if (!user?.isSuperAdmin) {
      console.error('[oauth-config] Access denied - user is not super admin')
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { clientId, clientSecret, redirectUri, isActive = true } = body

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, clientSecret, redirectUri' },
        { status: 400 }
      )
    }

    console.log('[oauth-config] Encrypting credentials...')

    // Encrypt sensitive data
    const encryptedConfig = {
      clientId: encrypt(clientId),
      clientSecret: encrypt(clientSecret),
      redirectUri // Not encrypted, not sensitive
    }

    // Upsert system config
    await db.collection<SystemConfig>(COLLECTIONS.SYSTEM_CONFIGS).updateOne(
      { key: 'fathom_oauth_app' },
      {
        $set: {
          config: encryptedConfig,
          isActive,
          createdBy: userId,
          updatedAt: new Date()
        },
        $setOnInsert: {
          key: 'fathom_oauth_app',
          createdAt: new Date()
        }
      },
      { upsert: true }
    )

    console.log('[oauth-config] OAuth configuration saved successfully')

    return NextResponse.json({
      success: true,
      message: 'Fathom OAuth app configured successfully. Users can now connect their Fathom accounts.'
    })
  } catch (error: any) {
    console.error('[oauth-config] Error saving configuration:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
