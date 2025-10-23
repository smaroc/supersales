'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { Integration, User, COLLECTIONS } from '@/lib/types'
import { encrypt } from '@/lib/encryption'
import { ZoomService } from '@/lib/services/zoom-service'
import { FathomService } from '@/lib/services/fathom-service'
import { FirefilesService } from '@/lib/services/firefiles-service'

const SUPPORTED_PLATFORMS = ['zoom', 'fathom', 'fireflies'] as const

type IntegrationPlatform = (typeof SUPPORTED_PLATFORMS)[number]

type IntegrationPayload = Record<string, string>

type TestResult = { success: boolean; message: string; details?: any }

async function getCurrentUser() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const { db } = await connectToDatabase()
  const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })

  if (!currentUser) {
    throw new Error('User not found')
  }

  return { db, currentUser }
}

function ensurePlatform(platform: string): IntegrationPlatform {
  if (SUPPORTED_PLATFORMS.includes(platform as IntegrationPlatform)) {
    return platform as IntegrationPlatform
  }

  throw new Error('Unsupported platform')
}

function validatePayload(platform: IntegrationPlatform, payload: IntegrationPayload) {
  const validations: Record<IntegrationPlatform, string[]> = {
    zoom: ['clientId', 'clientSecret'],
    fathom: ['apiKey'], // webhookSecret is auto-generated
    fireflies: ['apiKey', 'workspaceId']
  }

  for (const field of validations[platform]) {
    if (!payload[field]) {
      throw new Error(`Missing required field: ${field}`)
    }
  }
}

function resolveWebhookBaseUrl(origin?: string) {
  if (origin && origin.length > 0) {
    return origin
  }

  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  throw new Error('Unable to resolve webhook base URL')
}

export async function saveIntegrationConfiguration(
  rawPlatform: string,
  payload: IntegrationPayload,
  origin?: string
) {
  console.log('[integrations] Saving configuration for platform:', rawPlatform)

  const { db, currentUser } = await getCurrentUser()
  const platform = ensurePlatform(rawPlatform)

  validatePayload(platform, payload)

  const encryptedConfig: Record<string, any> = {}

  if (payload.clientId) encryptedConfig.clientId = encrypt(payload.clientId)
  if (payload.clientSecret) encryptedConfig.clientSecret = encrypt(payload.clientSecret)
  if (payload.apiKey) encryptedConfig.apiKey = encrypt(payload.apiKey)
  if (payload.webhookSecret) encryptedConfig.webhookSecret = encrypt(payload.webhookSecret)
  if (payload.workspaceId) encryptedConfig.workspaceId = payload.workspaceId

  const baseUrl = resolveWebhookBaseUrl(origin)
  const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/webhooks/${platform}/${currentUser.clerkId}`

  // For Fathom, create webhook automatically using the SDK
  let webhookId: string | undefined
  let webhookSecret: string | undefined

  if (platform === 'fathom' && payload.apiKey) {
    console.log('[integrations] Creating Fathom webhook via SDK...')
    try {
      const fathomService = new FathomService({ apiKey: payload.apiKey })
      const webhook = await fathomService.createWebhook(webhookUrl)

      webhookId = webhook.id
      webhookSecret = webhook.secret

      console.log('[integrations] Fathom webhook created:', webhookId)

      // Store the webhook secret from Fathom (overrides user-provided one)
      if (webhookSecret) {
        encryptedConfig.webhookSecret = encrypt(webhookSecret)
        console.log('[integrations] Webhook secret stored from Fathom API')
      }
    } catch (error: any) {
      console.error('[integrations] Failed to create Fathom webhook:', error.message)
      // Continue with saving the config even if webhook creation fails
      // User can manually set up webhook in Fathom dashboard
    }
  }

  const integration = await db.collection<Integration>(COLLECTIONS.INTEGRATIONS).findOneAndUpdate(
    {
      userId: currentUser._id,
      platform
    },
    {
      $set: {
        userId: currentUser._id,
        organizationId: currentUser.organizationId,
        platform,
        configuration: encryptedConfig,
        webhookUrl,
        webhookId, // Store the webhook ID from Fathom
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

  console.log('[integrations] Configuration saved successfully')

  return {
    success: true,
    platform: integration?.platform,
    isActive: integration?.isActive,
    webhookUrl,
    webhookId,
    webhookCreated: !!webhookId
  }
}

export async function deactivateIntegration(rawPlatform: string) {
  const { db, currentUser } = await getCurrentUser()
  const platform = ensurePlatform(rawPlatform)

  await db.collection<Integration>(COLLECTIONS.INTEGRATIONS).findOneAndUpdate(
    {
      userId: currentUser._id,
      platform
    },
    {
      $set: {
        isActive: false,
        syncStatus: 'idle',
        updatedAt: new Date()
      }
    }
  )

  return { success: true }
}

export async function getIntegrations() {
  const { db, currentUser } = await getCurrentUser()

  let filter: any = {}
  if (currentUser.isAdmin) {
    // Admin sees all integrations for their organization
    filter = { organizationId: currentUser.organizationId }
  } else {
    // Regular user sees only their own integrations
    filter = { userId: currentUser._id }
  }

  const integrations = await db.collection<Integration>(COLLECTIONS.INTEGRATIONS)
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray()

  return JSON.parse(JSON.stringify(integrations))
}

export async function testIntegrationConnection(rawPlatform: string, payload: IntegrationPayload): Promise<TestResult> {
  console.log('[integrations] Testing connection for platform:', rawPlatform)
  console.log('[integrations] Payload keys:', Object.keys(payload))

  const { currentUser } = await getCurrentUser() // Ensures the request is authenticated
  console.log('[integrations] User authenticated:', currentUser.email || currentUser.clerkId)

  const platform = ensurePlatform(rawPlatform)
  console.log('[integrations] Platform validated:', platform)

  try {
    validatePayload(platform, payload)
    console.log('[integrations] Payload validated successfully')
  } catch (error: any) {
    console.error('[integrations] Payload validation failed:', error.message)
    throw error
  }

  console.log('[integrations] Initiating connection test for:', platform)

  let result: TestResult
  switch (platform) {
    case 'zoom':
      result = await new ZoomService(payload).testConnection()
      break
    case 'fathom':
      result = await new FathomService(payload).testConnection()
      break
    case 'fireflies':
      result = await new FirefilesService(payload).testConnection()
      break
    default:
      throw new Error('Unsupported platform')
  }

  console.log('[integrations] Connection test completed for:', platform)
  console.log('[integrations] Test result:', JSON.stringify(result, null, 2))

  return result
}
