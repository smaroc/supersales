'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { Integration, User, COLLECTIONS } from '@/lib/types'
import { encrypt, decrypt } from '@/lib/encryption'
import { ZoomService } from '@/lib/services/zoom-service'
import { FathomService } from '@/lib/services/fathom-service'
import { FirefilesService } from '@/lib/services/firefiles-service'
import { ClaapService } from '@/lib/services/claap-service'
import { ObjectId } from 'mongodb'
import { analyzeCallAction } from './call-analysis'

const SUPPORTED_PLATFORMS = ['zoom', 'fathom', 'fireflies', 'claap'] as const

type IntegrationPlatform = (typeof SUPPORTED_PLATFORMS)[number]

type IntegrationPayload = Record<string, string>

type TestResult = { success: boolean; message: string; details?: any }

async function getCurrentUser() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const { db } = await connectToDatabase()
  let currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })

  // Auto-create user in MongoDB if not found
  if (!currentUser) {
    const { currentUser: clerkUser } = await import('@clerk/nextjs/server')
    const user = await clerkUser()

    if (!user) {
      throw new Error('User not found in Clerk')
    }

    console.log(`[integrations] User ${userId} not found in database, creating from Clerk data`)

    const newUser: Omit<User, '_id'> = {
      clerkId: userId,
      email: user.emailAddresses[0]?.emailAddress || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: 'sales_rep',
      isAdmin: false,
      isSuperAdmin: false,
      organizationId: new ObjectId(), // Default organization
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      avatar: user.imageUrl || undefined,
      permissions: {
        canViewAllData: false,
        canManageUsers: false,
        canManageSettings: false,
        canExportData: false,
        canDeleteData: false
      },
      preferences: {
        theme: 'system',
        notifications: {
          email: true,
          inApp: true,
          callSummaries: true,
          weeklyReports: true
        },
        dashboard: {
          defaultView: 'overview',
          refreshInterval: 30
        }
      }
    }

    const result = await db.collection<User>(COLLECTIONS.USERS).insertOne(newUser as User)
    currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ _id: result.insertedId })

    if (!currentUser) {
      throw new Error('Failed to create user in database')
    }

    console.log(`[integrations] User created successfully: ${currentUser.email}`)
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
    fireflies: ['apiKey', 'workspaceId'],
    claap: ['apiKey']
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
  if (payload.webhookId) encryptedConfig.webhookId = payload.webhookId

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

export async function importFathomMeetings(recordingIds: string[], apiKey: string): Promise<{
  success: boolean
  message: string
  imported: number
  skipped: number
  errors?: string[]
}> {
  console.log('[integrations] Importing specific Fathom meetings...')
  console.log('[integrations] Recording IDs:', recordingIds)

  try {
    const { db, currentUser } = await getCurrentUser()

    // Initialize Fathom service with provided API key
    const fathomService = new FathomService({ apiKey })

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    // Process each recording ID
    for (const recordingId of recordingIds) {
      try {
        // Check if call already exists
        const existingCall = await db.collection(COLLECTIONS.CALL_RECORDS).findOne({
          $and: [
            { fathomCallId: recordingId },
            { userId: currentUser._id }
          ]
        })

        if (existingCall) {
          console.log(`[integrations] Skipping recording ${recordingId} - already imported`)
          skipped++
          continue
        }

        // Fetch transcript for this recording
        console.log(`[integrations] Fetching transcript for recording ${recordingId}...`)
        let transcriptData
        try {
          transcriptData = await fathomService.getRecordingTranscript(recordingId)
        } catch (error: any) {
          console.error(`[integrations] Failed to fetch transcript for ${recordingId}:`, error.message)
          errors.push(`Recording ${recordingId}: ${error.message}`)
          skipped++
          continue
        }

        // Convert transcript array to text
        let transcriptText = ''
        if (transcriptData?.transcript && Array.isArray(transcriptData.transcript)) {
          transcriptText = transcriptData.transcript
            .map((item: any) => {
              const speakerName = item.speaker?.displayName || 'Unknown'
              const timestamp = item.timestamp || '00:00:00'
              const text = item.text || ''
              return `[${timestamp}] ${speakerName}: ${text}`
            })
            .join('\n')
        }

        // Parse invitees from transcript data if available
        const invitees = (transcriptData.calendarInvitees || []).map((invitee: any) => ({
          email: invitee.email || '',
          name: invitee.name || invitee.matchedSpeakerDisplayName || '',
          isExternal: invitee.isExternal || false
        }))

        // Calculate duration
        let actualDuration = 0
        if (transcriptData.recordingStartTime && transcriptData.recordingEndTime) {
          const startTime = new Date(transcriptData.recordingStartTime)
          const endTime = new Date(transcriptData.recordingEndTime)
          actualDuration = (endTime.getTime() - startTime.getTime()) / 1000 / 60
        }

        let scheduledDuration = 0
        if (transcriptData.scheduledStartTime && transcriptData.scheduledEndTime) {
          const startTime = new Date(transcriptData.scheduledStartTime)
          const endTime = new Date(transcriptData.scheduledEndTime)
          scheduledDuration = (endTime.getTime() - startTime.getTime()) / 1000 / 60
        }

        const callRecord = {
          organizationId: currentUser.organizationId,
          userId: currentUser._id,
          salesRepId: currentUser._id.toString(),
          salesRepName: `${currentUser.firstName} ${currentUser.lastName}`,
          source: 'fathom' as const,
          fathomCallId: recordingId,
          title: transcriptData.title || 'Imported Meeting',
          scheduledStartTime: transcriptData.scheduledStartTime ? new Date(transcriptData.scheduledStartTime) : new Date(),
          scheduledEndTime: transcriptData.scheduledEndTime ? new Date(transcriptData.scheduledEndTime) : new Date(),
          actualDuration: actualDuration,
          scheduledDuration: Math.round(scheduledDuration),
          transcript: transcriptText,
          recordingUrl: transcriptData.url || '',
          shareUrl: transcriptData.shareUrl || '',
          invitees: invitees,
          hasExternalInvitees: transcriptData.calendarInviteesDomainsType === 'one_or_more_external',
          metadata: {
            recordedBy: transcriptData.recordedBy?.name || '',
            recordedByEmail: transcriptData.recordedBy?.email || '',
            recordedByTeam: transcriptData.recordedBy?.team || '',
            summaryMarkdown: transcriptData.defaultSummary?.markdownFormatted || '',
            summaryTemplate: transcriptData.defaultSummary?.templateName || '',
            actionItems: transcriptData.actionItems || [],
            transcriptLanguage: transcriptData.transcriptLanguage || '',
            inviteeDomainsType: transcriptData.calendarInviteesDomainsType || '',
            importedFromHistory: true,
            importedAt: new Date().toISOString()
          },
          status: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        const result = await db.collection(COLLECTIONS.CALL_RECORDS).insertOne(callRecord)
        console.log(`[integrations] Imported call record: ${result.insertedId}`)

        // Trigger analysis
        try {
          await analyzeCallAction(result.insertedId.toString())
          console.log(`[integrations] Analysis triggered for: ${result.insertedId}`)
        } catch (error: any) {
          console.error(`[integrations] Analysis failed for ${result.insertedId}:`, error.message)
          // Continue even if analysis fails
        }

        imported++
      } catch (error: any) {
        console.error(`[integrations] Error processing recording ${recordingId}:`, error)
        errors.push(`Recording ${recordingId}: ${error.message}`)
        skipped++
      }
    }

    return {
      success: true,
      message: `Successfully imported ${imported} of ${recordingIds.length} meetings`,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error: any) {
    console.error('[integrations] Failed to import meetings:', error)
    return {
      success: false,
      message: error.message || 'Failed to import meetings',
      imported: 0,
      skipped: 0,
      errors: [error.message]
    }
  }
}

export async function syncFathomHistory(maxMeetings: number = 50): Promise<{
  success: boolean
  message: string
  imported: number
  skipped: number
  total: number
  errors?: string[]
}> {
  console.log('[integrations] Starting Fathom history sync...')
  console.log('[integrations] Max meetings to sync:', maxMeetings)

  try {
    const { db, currentUser } = await getCurrentUser()

    // Get Fathom integration for this user
    const integration = await db.collection<Integration>(COLLECTIONS.INTEGRATIONS).findOne({
      userId: currentUser._id,
      platform: 'fathom',
      isActive: true
    })

    if (!integration || !integration.configuration?.apiKey) {
      throw new Error('Fathom integration not configured. Please save your API key first.')
    }

    // Decrypt API key
    const apiKey = decrypt(integration.configuration.apiKey)

    // Initialize Fathom service
    const fathomService = new FathomService({ apiKey })

    // Fetch historical meetings
    console.log('[integrations] Fetching historical meetings...')
    const meetings = await fathomService.getHistoricalMeetings(maxMeetings)
    console.log(`[integrations] Found ${meetings.length} meetings`)

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    // Process each meeting
    for (const meeting of meetings) {
      try {
        // Skip if meeting has no recording
        if (!meeting.recordingId) {
          console.log(`[integrations] Skipping meeting ${meeting.id} - no recording`)
          skipped++
          continue
        }

        // Check if call already exists
        const existingCall = await db.collection(COLLECTIONS.CALL_RECORDS).findOne({
          $and: [
            { fathomCallId: meeting.recordingId.toString() },
            { userId: currentUser._id }
          ]
        })

        if (existingCall) {
          console.log(`[integrations] Skipping meeting ${meeting.recordingId} - already imported`)
          skipped++
          continue
        }

        // Fetch transcript for this recording
        console.log(`[integrations] Fetching transcript for recording ${meeting.recordingId}...`)
        let transcriptData
        try {
          transcriptData = await fathomService.getRecordingTranscript(meeting.recordingId)
        } catch (error: any) {
          console.error(`[integrations] Failed to fetch transcript for ${meeting.recordingId}:`, error.message)
          errors.push(`Meeting "${meeting.title}": ${error.message}`)
          skipped++
          continue
        }

        // Convert transcript array to text
        let transcriptText = ''
        if (transcriptData?.transcript && Array.isArray(transcriptData.transcript)) {
          transcriptText = transcriptData.transcript
            .map((item: any) => {
              const speakerName = item.speaker?.displayName || 'Unknown'
              const timestamp = item.timestamp || '00:00:00'
              const text = item.text || ''
              return `[${timestamp}] ${speakerName}: ${text}`
            })
            .join('\n')
        }

        // Parse invitees
        const invitees = (meeting.calendarInvitees || []).map((invitee: any) => ({
          email: invitee.email || '',
          name: invitee.name || invitee.matchedSpeakerDisplayName || '',
          isExternal: invitee.isExternal || false
        }))

        // Calculate duration
        let actualDuration = 0
        if (meeting.recordingStartTime && meeting.recordingEndTime) {
          const startTime = new Date(meeting.recordingStartTime)
          const endTime = new Date(meeting.recordingEndTime)
          actualDuration = (endTime.getTime() - startTime.getTime()) / 1000 / 60
        }

        let scheduledDuration = 0
        if (meeting.scheduledStartTime && meeting.scheduledEndTime) {
          const startTime = new Date(meeting.scheduledStartTime)
          const endTime = new Date(meeting.scheduledEndTime)
          scheduledDuration = (endTime.getTime() - startTime.getTime()) / 1000 / 60
        }

        // Create call record
        const callRecord = {
          organizationId: currentUser.organizationId,
          userId: currentUser._id,
          salesRepId: currentUser._id.toString(),
          salesRepName: `${currentUser.firstName} ${currentUser.lastName}`,
          source: 'fathom' as const,
          fathomCallId: meeting.recordingId.toString(),
          title: meeting.title || 'Untitled Meeting',
          scheduledStartTime: meeting.scheduledStartTime ? new Date(meeting.scheduledStartTime) : new Date(),
          scheduledEndTime: meeting.scheduledEndTime ? new Date(meeting.scheduledEndTime) : new Date(),
          actualDuration: actualDuration,
          scheduledDuration: Math.round(scheduledDuration),
          transcript: transcriptText,
          recordingUrl: meeting.url || '',
          shareUrl: meeting.shareUrl || '',
          invitees: invitees,
          hasExternalInvitees: meeting.calendarInviteesDomainsType === 'one_or_more_external',
          metadata: {
            recordedBy: meeting.recordedBy?.name || '',
            recordedByEmail: meeting.recordedBy?.email || '',
            recordedByTeam: meeting.recordedBy?.team || '',
            summaryMarkdown: meeting.defaultSummary?.markdownFormatted || '',
            summaryTemplate: meeting.defaultSummary?.templateName || '',
            actionItems: meeting.actionItems || [],
            transcriptLanguage: meeting.transcriptLanguage || '',
            inviteeDomainsType: meeting.calendarInviteesDomainsType || '',
            importedFromHistory: true,
            importedAt: new Date().toISOString()
          },
          status: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        const result = await db.collection(COLLECTIONS.CALL_RECORDS).insertOne(callRecord)
        console.log(`[integrations] Imported call record: ${result.insertedId}`)

        // Trigger analysis
        try {
          await analyzeCallAction(result.insertedId.toString())
          console.log(`[integrations] Analysis triggered for: ${result.insertedId}`)
        } catch (error: any) {
          console.error(`[integrations] Analysis failed for ${result.insertedId}:`, error.message)
          // Continue even if analysis fails
        }

        imported++
      } catch (error: any) {
        console.error(`[integrations] Error processing meeting ${meeting.id}:`, error)
        errors.push(`Meeting "${meeting.title}": ${error.message}`)
        skipped++
      }
    }

    console.log('[integrations] Fathom history sync completed')
    console.log(`[integrations] Imported: ${imported}, Skipped: ${skipped}, Total: ${meetings.length}`)

    return {
      success: true,
      message: `Successfully synced ${imported} of ${meetings.length} meetings`,
      imported,
      skipped,
      total: meetings.length,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error: any) {
    console.error('[integrations] Fathom history sync failed:', error)
    return {
      success: false,
      message: error.message || 'Failed to sync Fathom history',
      imported: 0,
      skipped: 0,
      total: 0,
      errors: [error.message]
    }
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

export async function getIntegrationConfigurations() {
  const { db, currentUser } = await getCurrentUser()

  const integrations = await db.collection<Integration>(COLLECTIONS.INTEGRATIONS)
    .find({ userId: currentUser._id })
    .toArray()

  // Decrypt configurations for display
  const decryptedConfigs: Record<string, Record<string, string>> = {}

  for (const integration of integrations) {
    if (!integration.configuration) continue

    const decrypted: Record<string, string> = {}

    // Decrypt each encrypted field
    for (const [key, value] of Object.entries(integration.configuration)) {
      if (typeof value === 'string' && value) {
        try {
          // Fields that are encrypted
          if (['apiKey', 'clientId', 'clientSecret', 'webhookSecret'].includes(key)) {
            decrypted[key] = decrypt(value)
          } else {
            // Non-encrypted fields (like workspaceId)
            decrypted[key] = value
          }
        } catch (error) {
          console.error(`Error decrypting ${key} for ${integration.platform}:`, error)
          decrypted[key] = '' // Don't show corrupted data
        }
      }
    }

    decryptedConfigs[integration.platform] = decrypted
  }

  return decryptedConfigs
}

export async function testIntegrationConnection(
  rawPlatform: string,
  payload: IntegrationPayload,
  origin?: string
): Promise<TestResult & { meetings?: any[]; webhookCreated?: boolean; webhookId?: string; webhookError?: string }> {
  console.log('[integrations] Testing connection for platform:', rawPlatform)
  console.log('[integrations] Payload keys:', Object.keys(payload))

  const { db, currentUser } = await getCurrentUser() // Ensures the request is authenticated
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

  let result: TestResult & { meetings?: any[]; webhookCreated?: boolean; webhookId?: string; webhookError?: string }

  switch (platform) {
    case 'zoom':
      result = await new ZoomService(payload).testConnection()
      break
    case 'fathom': {
      // For Fathom, test connection, fetch meetings, and create webhook
      const fathomService = new FathomService(payload)
      const testResult = await fathomService.testConnection()
      
      if (!testResult.success) {
        result = testResult
        break
      }

      // Fetch last 10 meetings
      console.log('[integrations] Fetching last 10 meetings...')
      let meetings: any[] = []
      try {
        meetings = await fathomService.getHistoricalMeetings(10)
        console.log(`[integrations] Found ${meetings.length} meetings`)
      } catch (error: any) {
        console.error('[integrations] Error fetching meetings:', error.message)
        meetings = []
      }

      // Create webhook if API key is provided
      let webhookCreated = false
      let webhookId: string | undefined
      let webhookError: string | undefined

      if (payload.apiKey) {
        try {
          const baseUrl = resolveWebhookBaseUrl(origin)
          const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/webhooks/${platform}/${currentUser.clerkId}`
          
          console.log('[integrations] Creating Fathom webhook during test...')
          const webhook = await fathomService.createWebhook(webhookUrl)
          
          webhookId = webhook.id
          webhookCreated = true
          
          // Store the webhook configuration temporarily (will be saved when user clicks Save)
          const webhookSecret = webhook.secret
          if (webhookSecret) {
            // Store in integration document if it exists, or prepare for save
            await db.collection<Integration>(COLLECTIONS.INTEGRATIONS).findOneAndUpdate(
              {
                userId: currentUser._id,
                platform: 'fathom'
              },
              {
                $set: {
                  webhookId: webhook.id,
                  webhookUrl,
                  updatedAt: new Date()
                },
                $setOnInsert: {
                  userId: currentUser._id,
                  organizationId: currentUser.organizationId,
                  platform: 'fathom',
                  isActive: false,
                  syncStatus: 'idle',
                  createdAt: new Date()
                }
              },
              {
                upsert: true
              }
            )
            console.log('[integrations] Webhook ID stored temporarily')
          }
          
          console.log('[integrations] Webhook created successfully:', webhookId)
        } catch (error: any) {
          console.error('[integrations] Failed to create webhook during test:', error.message)
          webhookError = error.message
        }
      }

      result = {
        ...testResult,
        meetings,
        webhookCreated,
        webhookId,
        webhookError
      }
      break
    }
    case 'fireflies':
      result = await new FirefilesService(payload).testConnection()
      break
    case 'claap': {
      const claapService = new ClaapService(payload)
      const testResult = await claapService.testConnection()

      result = {
        ...testResult
      }
      break
    }
    default:
      throw new Error('Unsupported platform')
  }

  console.log('[integrations] Connection test completed for:', platform)
  console.log('[integrations] Test result:', JSON.stringify(result, null, 2))

  return result
}
