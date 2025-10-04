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
    fathom: ['apiKey', 'webhookSecret'],
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

  return {
    success: true,
    platform: integration?.platform,
    isActive: integration?.isActive,
    webhookUrl
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

export async function testIntegrationConnection(rawPlatform: string, payload: IntegrationPayload): Promise<TestResult> {
  await getCurrentUser() // Ensures the request is authenticated
  const platform = ensurePlatform(rawPlatform)

  validatePayload(platform, payload)

  switch (platform) {
    case 'zoom':
      return new ZoomService(payload).testConnection()
    case 'fathom':
      return new FathomService(payload).testConnection()
    case 'fireflies':
      return new FirefilesService(payload).testConnection()
    default:
      throw new Error('Unsupported platform')
  }
}
