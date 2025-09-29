import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { Integration, User, COLLECTIONS } from '@/lib/types'
import { encrypt, decrypt } from '@/lib/encryption'
import { ObjectId } from 'mongodb'

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user data
    const { db } = await connectToDatabase()
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const integration = await db.collection<Integration>(COLLECTIONS.INTEGRATIONS).findOne({
      userId: currentUser._id,
      platform: params.platform as 'fathom' | 'fireflies' | 'zoom'
    })

    if (!integration) {
      return NextResponse.json({
        platform: params.platform as 'fathom' | 'fireflies' | 'zoom',
        isActive: false,
        configured: false
      })
    }

    // Return without sensitive data
    return NextResponse.json({
      platform: integration.platform,
      isActive: integration.isActive,
      configured: true,
      configuration: integration.configuration,
      lastSyncAt: integration.lastSyncAt,
      syncStatus: integration.syncStatus,
      syncError: integration.syncError
    })
  } catch (error) {
    console.error('Error fetching integration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user data
    const { db } = await connectToDatabase()
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { clientId, clientSecret, apiKey, webhookSecret, workspaceId } = body

    // Validate required fields based on platform
    const validations = {
      zoom: ['clientId', 'clientSecret'],
      fathom: ['apiKey', 'webhookSecret'],
      firefiles: ['apiKey', 'workspaceId']
    }

    const requiredFields = validations[params.platform as keyof typeof validations]
    if (!requiredFields) {
      return NextResponse.json(
        { error: 'Unsupported platform' },
        { status: 400 }
      )
    }

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Encrypt sensitive data
    const encryptedConfig: any = {}
    if (clientId) encryptedConfig.clientId = encrypt(clientId)
    if (clientSecret) encryptedConfig.clientSecret = encrypt(clientSecret)
    if (apiKey) encryptedConfig.apiKey = encrypt(apiKey)
    if (webhookSecret) encryptedConfig.webhookSecret = encrypt(webhookSecret)
    if (workspaceId) encryptedConfig.workspaceId = workspaceId

    const webhookUrl = `${request.nextUrl.origin}/api/webhooks/${params.platform}`

    const integration = await db.collection<Integration>(COLLECTIONS.INTEGRATIONS).findOneAndUpdate(
      {
        userId: currentUser._id,
        platform: params.platform as 'fathom' | 'fireflies' | 'zoom'
      },
      {
        $set: {
          userId: currentUser._id,
          organizationId: currentUser.organizationId,
          platform: params.platform as 'fathom' | 'fireflies' | 'zoom',
          configuration: encryptedConfig,
          webhookUrl,
          isActive: true,
          syncStatus: 'idle',
          lastSync: new Date(),
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      {
        upsert: true,
        returnDocument: 'after'
      }
    )

    return NextResponse.json({
      success: true,
      platform: integration?.platform,
      isActive: integration?.isActive,
      webhookUrl: `${request.nextUrl.origin}/api/webhooks/${params.platform}`
    })
  } catch (error) {
    console.error('Error saving integration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user data
    const { db } = await connectToDatabase()
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await db.collection<Integration>(COLLECTIONS.INTEGRATIONS).findOneAndUpdate(
      {
        userId: currentUser._id,
        platform: params.platform as 'fathom' | 'fireflies' | 'zoom'
      },
      {
        $set: {
          isActive: false,
          syncStatus: 'idle',
          updatedAt: new Date()
        }
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deactivating integration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}