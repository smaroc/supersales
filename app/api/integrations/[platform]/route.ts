import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import { Integration } from '@/lib/models/integration'
import { encrypt, decrypt } from '@/lib/encryption'

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const integration = await Integration.findOne({
      userId: session.user.id,
      platform: params.platform
    })

    if (!integration) {
      return NextResponse.json({ 
        platform: params.platform,
        isActive: false,
        configured: false 
      })
    }

    // Return without sensitive data
    return NextResponse.json({
      platform: integration.platform,
      isActive: integration.isActive,
      configured: true,
      webhookUrl: integration.webhookUrl,
      lastSync: integration.lastSync,
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
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { clientId, clientSecret, apiKey, webhookSecret, workspaceId } = body

    await dbConnect()

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

    const integration = await Integration.findOneAndUpdate(
      {
        userId: session.user.id,
        platform: params.platform
      },
      {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        platform: params.platform,
        configuration: encryptedConfig,
        webhookUrl,
        isActive: true,
        syncStatus: 'idle',
        lastSync: new Date()
      },
      {
        upsert: true,
        new: true
      }
    )

    return NextResponse.json({
      success: true,
      platform: integration.platform,
      isActive: integration.isActive,
      webhookUrl: integration.webhookUrl
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
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    await Integration.findOneAndUpdate(
      {
        userId: session.user.id,
        platform: params.platform
      },
      {
        isActive: false,
        syncStatus: 'idle'
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