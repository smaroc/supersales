import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/mongodb'
import { CallRecord, User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'
import { inngest } from '@/lib/inngest.config'
import { DuplicateCallDetectionService } from '@/lib/services/duplicate-call-detection-service'

interface FathomWebhookData {
  // Old flat format
  fathom_user_emaill?: string // Note: typo in the field name from Fathom
  fathom_user_name?: string
  fathom_user_team?: string
  id?: string
  call_id?: string
  fathom_id?: string
  meeting_id?: string
  meeting_external_domains?: string
  meeting_external_domains_domaine_name?: string
  meeting_has_external_invitees?: string
  meeting_invitees?: string
  meeting_invitees_email?: string
  meeting_invitees_is_external?: string
  meeting_invitees_name?: string
  meeting_join_url?: string
  meeting_scheduled_duration_in_minute?: string
  meeting_scheduled_end_time?: string
  meeting_scheduled_start_time?: string
  recording_duration_in_minutes?: string
  recording_share_url?: string
  recording_url?: string
  transcript_plaintext?: string

  // New nested format
  fathom_user?: {
    email?: string
    name?: string
    [key: string]: unknown
  }
  meeting?: {
    title?: string
    scheduled_start_time?: string
    scheduled_end_time?: string
    scheduled_duration_in_minutes?: string | number
    invitees?: unknown[]
    has_external_invitees?: string | boolean
    [key: string]: unknown
  }
  recording?: {
    duration_in_minutes?: string | number
    share_url?: string
    url?: string
    [key: string]: unknown
  }
  transcript?: {
    plaintext?: string
    [key: string]: unknown
  } | Array<{
    speaker?: {
      display_name?: string
      matched_calendar_invitee_email?: string
    }
    text?: string
    timestamp?: string
  }>

  // Newest format (2025)
  recording_id?: number
  meeting_title?: string
  title?: string
  recorded_by?: {
    email?: string
    email_domain?: string
    name?: string
    team?: string
  }
  recording_start_time?: string
  recording_end_time?: string
  scheduled_start_time?: string
  scheduled_end_time?: string
  share_url?: string
  url?: string
  calendar_invitees?: Array<{
    email?: string
    email_domain?: string
    is_external?: boolean
    matched_speaker_display_name?: string
    name?: string
  }>
  calendar_invitees_domains_type?: string
  default_summary?: {
    markdown_formatted?: string
    template_name?: string
  }
  action_items?: Array<{
    assignee?: {
      email?: string
      name?: string
      team?: string | null
    }
    completed?: boolean
    description?: string
    recording_playback_url?: string
    recording_timestamp?: string
    user_generated?: boolean
  }>
  transcript_language?: string

  [key: string]: unknown // Allow for additional unknown fields
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  console.log('=== FATHOM WEBHOOK REQUEST START (USER-SPECIFIC) ===')
  console.log('Method:', request.method)
  console.log('URL:', request.url)
  console.log('Headers:', Object.fromEntries(request.headers.entries()))

  try {
    const resolvedParams = await params
    const { userId } = resolvedParams

    if (!userId) {
      console.error('Missing userId in webhook URL')
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const body = await request.json()
    console.log('Received Fathom webhook body for user', userId, ':', JSON.stringify(body, null, 2))

    // Handle both array and single object formats
    let webhookDataArray = Array.isArray(body) ? body : [body]

    // Check if the data is wrapped in a 'data' field as JSON string (new Fathom format)
    if (webhookDataArray[0]?.data && typeof webhookDataArray[0].data === 'string') {
      console.log('Detected new Fathom format with data field, parsing...')
      webhookDataArray = webhookDataArray.map(item => JSON.parse(item.data))
    }

    // Check if the data is wrapped in a 'transcript' field as JSON string (alternative Fathom format)
    if (webhookDataArray[0]?.transcript && typeof webhookDataArray[0].transcript === 'string') {
      console.log('Detected Fathom format with transcript field as JSON string, parsing...')
      webhookDataArray = webhookDataArray.map(item => JSON.parse(item.transcript))
    }

    console.log('Normalized to array format, processing', webhookDataArray.length, 'items')

    const { db } = await connectToDatabase()

    // Find the user - userId could be MongoDB ObjectId or Clerk ID
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId)

    const user = await db.collection<User>(COLLECTIONS.USERS).findOne({
      ...(isValidObjectId
        ? { _id: new ObjectId(userId) }
        : { clerkId: userId }
      ),
      isActive: true
    })

    if (!user) {
      console.warn(`User not found for userId: ${userId} (searched by ${isValidObjectId ? '_id' : 'clerkId'})`)
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 404 }
      )
    }

    console.log(`Processing webhook for user: ${user.firstName} ${user.lastName} (${user.email})`)

    const results = []

    for (const webhookData of webhookDataArray as FathomWebhookData[]) {
      try {
        console.log('=== PROCESSING INDIVIDUAL WEBHOOK ITEM ===')
        console.log('Raw webhook data keys:', Object.keys(webhookData))
        console.log('Raw webhook data:', JSON.stringify(webhookData, null, 2))

        // Extract and validate required fields - handle old, intermediate, and newest formats
        let fathomCallId: string | undefined
        let userEmail: string | undefined
        let userName: string | undefined
        let meetingTitle: string | undefined
        let scheduledStartTime: string | undefined
        let scheduledEndTime: string | undefined
        let scheduledDuration: string | undefined
        let actualDuration: string | undefined
        let shareUrl: string | undefined
        let recordingUrl: string | undefined
        let transcript: string | undefined
        let inviteesData: string | undefined
        let hasExternalInvitees: string | undefined

        // Detect format based on presence of specific fields
        const isNewestFormat = !!(webhookData.recording_id || webhookData.calendar_invitees)
        const isNestedFormat = !!(webhookData.fathom_user && !isNewestFormat)

        if (isNewestFormat) {
          // Newest format (2025) - direct fields with calendar_invitees
          fathomCallId = webhookData.recording_id?.toString()
          userEmail = webhookData.recorded_by?.email
          userName = webhookData.recorded_by?.name
          meetingTitle = webhookData.meeting_title || webhookData.title
          scheduledStartTime = webhookData.scheduled_start_time
          scheduledEndTime = webhookData.scheduled_end_time
          shareUrl = webhookData.share_url
          recordingUrl = webhookData.url

          // Calculate duration from start/end times if available
          if (webhookData.recording_start_time && webhookData.recording_end_time) {
            const startTime = new Date(webhookData.recording_start_time)
            const endTime = new Date(webhookData.recording_end_time)
            actualDuration = ((endTime.getTime() - startTime.getTime()) / 1000 / 60).toFixed(2)
          }

          // Calculate scheduled duration from scheduled times
          if (webhookData.scheduled_start_time && webhookData.scheduled_end_time) {
            const startTime = new Date(webhookData.scheduled_start_time)
            const endTime = new Date(webhookData.scheduled_end_time)
            scheduledDuration = ((endTime.getTime() - startTime.getTime()) / 1000 / 60).toFixed(0)
          }

          // Handle transcript - could be array or object
          if (Array.isArray(webhookData.transcript)) {
            transcript = convertTranscriptArrayToText(webhookData.transcript)
          } else if (webhookData.transcript && typeof webhookData.transcript === 'object' && 'plaintext' in webhookData.transcript) {
            transcript = (webhookData.transcript as { plaintext?: string }).plaintext
          }

          inviteesData = JSON.stringify(webhookData.calendar_invitees || [])
          hasExternalInvitees = webhookData.calendar_invitees_domains_type === 'one_or_more_external' ? 'True' : 'False'

          console.log('Detected newest Fathom format (2025) with calendar_invitees')
        } else if (isNestedFormat) {
          // Intermediate nested format
          fathomCallId = webhookData.id?.toString()
          userEmail = webhookData.fathom_user?.email
          userName = webhookData.fathom_user?.name
          meetingTitle = webhookData.meeting?.title
          scheduledStartTime = webhookData.meeting?.scheduled_start_time
          scheduledEndTime = webhookData.meeting?.scheduled_end_time
          scheduledDuration = webhookData.meeting?.scheduled_duration_in_minutes?.toString()
          actualDuration = webhookData.recording?.duration_in_minutes?.toString()
          shareUrl = webhookData.recording?.share_url
          recordingUrl = webhookData.recording?.url

          // Handle transcript - could be array or object
          if (Array.isArray(webhookData.transcript)) {
            transcript = convertTranscriptArrayToText(webhookData.transcript)
          } else if (webhookData.transcript && typeof webhookData.transcript === 'object' && 'plaintext' in webhookData.transcript) {
            transcript = (webhookData.transcript as { plaintext?: string }).plaintext
          }

          inviteesData = JSON.stringify(webhookData.meeting?.invitees || [])
          hasExternalInvitees = webhookData.meeting?.has_external_invitees?.toString()

          console.log('Detected intermediate nested Fathom format')
        } else {
          // Old flat format
          fathomCallId = webhookData.id
          userEmail = webhookData.fathom_user_emaill
          userName = webhookData.fathom_user_name
          meetingTitle = webhookData.meeting_title
          scheduledStartTime = webhookData.meeting_scheduled_start_time
          scheduledEndTime = webhookData.meeting_scheduled_end_time
          scheduledDuration = webhookData.meeting_scheduled_duration_in_minute
          actualDuration = webhookData.recording_duration_in_minutes
          shareUrl = webhookData.recording_share_url
          recordingUrl = webhookData.recording_url
          transcript = webhookData.transcript_plaintext
          inviteesData = webhookData.meeting_invitees
          hasExternalInvitees = webhookData.meeting_has_external_invitees

          console.log('Detected old flat Fathom format')
        }

        console.log('Extracted fathomCallId:', fathomCallId)
        console.log('Available id fields:', {
          id: webhookData.id,
          call_id: webhookData.call_id,
          fathom_id: webhookData.fathom_id,
          meeting_id: webhookData.meeting_id
        })

        // Generate a unique identifier for this call - use fathomCallId if available, otherwise use timestamp + user
        const callIdentifier = fathomCallId || `fathom_${Date.now()}_${user._id}`
        console.log('Using call identifier:', callIdentifier)

        // Parse invitees information - pass the correct format flag and invitees data
        const invitees = parseInviteesData(
          inviteesData || '',
          isNewestFormat || isNestedFormat,
          isNewestFormat ? webhookData.calendar_invitees : webhookData.meeting?.invitees
        )

        // Resolve the actual sales rep from the webhook data
        // This handles the case where webhook comes from Head of Sales integration
        // but the call belongs to a specific sales rep
        const salesRepResolution = await DuplicateCallDetectionService.resolveSalesRep({
          db,
          organizationId: user.organizationId,
          salesRepEmail: userEmail,
          salesRepName: userName,
          fallbackUserId: user._id
        })

        const actualSalesRep = salesRepResolution.user || user
        console.log(`Sales rep resolved: ${actualSalesRep.firstName} ${actualSalesRep.lastName} (${actualSalesRep.email}) - resolved by: ${salesRepResolution.resolvedBy}`)

        // Check if call already exists using composite key detection
        // Composite key: scheduled date + client name + meeting title
        const duplicateCheck = await DuplicateCallDetectionService.checkForDuplicate(db, {
          organizationId: user.organizationId,
          salesRepId: actualSalesRep._id?.toString() || '',
          scheduledStartTime: scheduledStartTime ? new Date(scheduledStartTime) : new Date(),
          meetingTitle: meetingTitle || 'Untitled Meeting',
          salesRepEmail: userEmail,
          salesRepName: userName,
          leadEmails: invitees.map(i => i.email).filter(Boolean),
          leadNames: invitees.map(i => i.name).filter(Boolean),
          fathomCallId: callIdentifier
        })

        if (duplicateCheck.isDuplicate) {
          console.log(`Call already exists: ${callIdentifier} (${duplicateCheck.matchType}: ${duplicateCheck.message})`)
          results.push({
            fathomCallId: callIdentifier,
            status: 'skipped',
            message: duplicateCheck.message,
            existingCallId: duplicateCheck.existingCallId
          })
          continue
        }

        console.log(`Processing new call for sales rep ${actualSalesRep._id?.toString()}: ${callIdentifier}`)

        // Create call record - assign to the resolved sales rep
        const salesRepName = userName || `${actualSalesRep.firstName} ${actualSalesRep.lastName}`

        const callRecord: Partial<CallRecord> = {
          organizationId: user.organizationId,
          salesRepId: actualSalesRep._id?.toString() || '',
          salesRepName: salesRepName,
          source: 'fathom' as const,
          title: meetingTitle || 'Untitled Meeting',
          scheduledStartTime: scheduledStartTime ? new Date(scheduledStartTime) : new Date(),
          scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime) : new Date(),
          actualDuration: actualDuration ? parseFloat(actualDuration) : 0,
          scheduledDuration: scheduledDuration ? parseInt(scheduledDuration) : 0,
          transcript: transcript || '',
          recordingUrl: recordingUrl || '',
          shareUrl: shareUrl || '',
          invitees: invitees || [],
          hasExternalInvitees: hasExternalInvitees === 'True',
          metadata: {
            fathomUserName: userName || '',
            fathomUserEmail: userEmail || '',
            fathomUserTeam: webhookData.fathom_user_team || webhookData.recorded_by?.team || '',
            meetingJoinUrl: webhookData.meeting_join_url || '',
            externalDomains: webhookData.meeting_external_domains || '',
            // Add new fields from newest format
            ...(webhookData.default_summary?.markdown_formatted && {
              summaryMarkdown: webhookData.default_summary.markdown_formatted,
              summaryTemplate: webhookData.default_summary.template_name
            }),
            ...(webhookData.action_items && {
              actionItems: webhookData.action_items
            }),
            ...(webhookData.transcript_language && {
              transcriptLanguage: webhookData.transcript_language
            }),
            ...(webhookData.calendar_invitees_domains_type && {
              inviteeDomainsType: webhookData.calendar_invitees_domains_type
            })
          },
          status: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          fathomCallId: callIdentifier
        }

        const result = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).insertOne(callRecord as CallRecord)

        // Trigger Inngest function to process the call record asynchronously
        console.log(`=== TRIGGERING INNGEST PROCESSING ===`)
        console.log(`Call Record ID: ${result.insertedId.toString()}`)
        console.log(`Call Identifier: ${callIdentifier}`)
        console.log(`Transcript Length: ${(transcript || '').length} characters`)

        await inngest.send({
          name: 'call/process',
          data: {
            callRecordId: result.insertedId.toString(),
            source: 'fathom' as const,
          },
        })

        console.log(`=== INNGEST EVENT SENT ===`)
        console.log(`Successfully queued Fathom call for processing: ${callIdentifier}`)
        results.push({
          fathomCallId: callIdentifier,
          status: 'success',
          message: 'Call record created and queued for processing',
          callRecordId: result.insertedId
        })

      } catch (error) {
        const errorId = webhookData.id || 'unknown'
        console.error(`Error processing call ${errorId}:`, error)
        results.push({
          fathomCallId: errorId,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const response = {
      message: 'Webhook processed',
      userId,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      results,
      totalProcessed: webhookDataArray.length,
      successful: results.filter(r => r.status === 'success').length,
      errors: results.filter(r => r.status === 'error').length,
      warnings: results.filter(r => r.status === 'warning').length,
      skipped: results.filter(r => r.status === 'skipped').length
    }

    console.log('=== FATHOM WEBHOOK RESPONSE (USER-SPECIFIC) ===', response)
    console.log('=== FATHOM WEBHOOK REQUEST END ===')

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('=== FATHOM WEBHOOK ERROR (USER-SPECIFIC) ===', error)
    const errorResponse = {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
    console.log('=== FATHOM WEBHOOK ERROR RESPONSE ===', errorResponse)
    console.log('=== FATHOM WEBHOOK REQUEST END (ERROR) ===')

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Add handlers for other HTTP methods to debug 405 errors
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const resolvedParams = await params
  const { userId } = resolvedParams

  console.log('=== FATHOM WEBHOOK GET REQUEST (USER-SPECIFIC) ===')
  console.log('URL:', request.url)
  console.log('UserId:', userId)
  console.log('Headers:', Object.fromEntries(request.headers.entries()))

  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests',
      method: request.method,
      url: request.url,
      userId
    },
    { status: 405 }
  )
}

// Helper function to convert transcript array to plain text
function convertTranscriptArrayToText(transcriptArray: Array<{
  speaker?: { display_name?: string; matched_calendar_invitee_email?: string }
  text?: string
  timestamp?: string
}>): string {
  return transcriptArray
    .map(item => {
      const speakerName = item.speaker?.display_name || 'Unknown'
      const timestamp = item.timestamp || '00:00:00'
      const text = item.text || ''
      return `[${timestamp}] ${speakerName}: ${text}`
    })
    .join('\n')
}

function parseInviteesData(inviteesString: string, isNewFormat: boolean = false, inviteesArray?: unknown[]): Array<{
  email: string
  name: string
  isExternal: boolean
}> {
  // Handle new format with invitees array
  if (isNewFormat && inviteesArray && Array.isArray(inviteesArray)) {
    try {
      return inviteesArray.map((invitee) => {
        const inviteeObj = invitee as Record<string, unknown>

        // Handle different field names for external status
        let isExternal = false
        if (typeof inviteeObj?.is_external === 'boolean') {
          isExternal = inviteeObj.is_external
        } else if (typeof inviteeObj?.is_external === 'string') {
          isExternal = inviteeObj.is_external === 'True' || inviteeObj.is_external === 'true'
        } else if (typeof inviteeObj?.isExternal === 'boolean') {
          isExternal = inviteeObj.isExternal
        }

        return {
          email: (inviteeObj?.email as string) || '',
          name: (inviteeObj?.name as string) ||
                (inviteeObj?.displayName as string) ||
                (inviteeObj?.matched_speaker_display_name as string) || '',
          isExternal: isExternal
        }
      })
    } catch (error) {
      console.error('Error parsing new format invitees data:', error)
      return []
    }
  }

  // Handle old format with string parsing
  if (!inviteesString) return []

  try {
    const lines = inviteesString.split('\n')
    const invitee: { [key: string]: string } = {}

    lines.forEach(line => {
      const [key, value] = line.split(': ')
      if (key && value) {
        invitee[key.trim()] = value.trim()
      }
    })

    return [{
      email: invitee.email || '',
      name: invitee.name || '',
      isExternal: invitee.is_external === 'True'
    }]
  } catch (error) {
    console.error('Error parsing invitees data:', error)
    return []
  }
}