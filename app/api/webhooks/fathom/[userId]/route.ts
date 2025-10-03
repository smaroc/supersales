import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/mongodb'
import { CallRecord, User, COLLECTIONS } from '@/lib/types'
import { CallEvaluationService } from '@/lib/services/call-evaluation-service'

interface FathomWebhookData {
  fathom_user_emaill: string // Note: typo in the field name from Fathom
  fathom_user_name: string
  fathom_user_team: string
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
  meeting_title?: string
  recording_duration_in_minutes?: string
  recording_share_url?: string
  recording_url?: string
  transcript_plaintext?: string
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
  }
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

    console.log('Normalized to array format, processing', webhookDataArray.length, 'items')

    const { db } = await connectToDatabase()

    // Find the user by clerk ID (userId from URL)
    const user = await db.collection<User>(COLLECTIONS.USERS).findOne({
      clerkId: userId,
      isActive: true
    })

    if (!user) {
      console.warn(`User not found for userId: ${userId}`)
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

        // Extract and validate required fields - handle both old and new formats
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

        if (webhookData.fathom_user) {
          // New nested format
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
          transcript = webhookData.transcript?.plaintext
          inviteesData = JSON.stringify(webhookData.meeting?.invitees || [])
          hasExternalInvitees = webhookData.meeting?.has_external_invitees?.toString()
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

        // Verify that the webhook email matches the user's email (security check)
        if (userEmail && userEmail.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
          console.warn(`Email mismatch: webhook email ${userEmail} vs user email ${user.email}`)
          results.push({
            fathomCallId,
            status: 'warning',
            message: 'Email mismatch between webhook and authenticated user'
          })
          continue
        }

        // Parse invitees information
        const invitees = parseInviteesData(inviteesData || '', webhookData.fathom_user ? true : false, webhookData.meeting?.invitees)

        // Check if call already exists (check both fathomCallId and our generated identifier)
        const existingCall = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).findOne({
          $or: [
            { fathomCallId: callIdentifier },
            ...(fathomCallId ? [{ fathomCallId: fathomCallId }] : []),
            // For calls without fathomCallId, check by title and time to avoid duplicates
            ...((!fathomCallId && meetingTitle && scheduledStartTime) ? [{
              organizationId: user.organizationId,
              salesRepId: user._id?.toString(),
              title: meetingTitle,
              scheduledStartTime: new Date(scheduledStartTime)
            }] : [])
          ]
        })

        if (existingCall) {
          console.log(`Call already exists: ${callIdentifier}`)
          results.push({
            fathomCallId: callIdentifier,
            status: 'skipped',
            message: 'Call already processed'
          })
          continue
        }

        // Create call record - build it dynamically to avoid undefined/null field issues
        const callRecord: Partial<CallRecord> = {
          organizationId: user.organizationId,
          salesRepId: user._id?.toString() || '',
          salesRepName: `${user.firstName} ${user.lastName}`,
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
            fathomUserTeam: webhookData.fathom_user_team || '',
            meetingJoinUrl: webhookData.meeting_join_url || '',
            externalDomains: webhookData.meeting_external_domains || ''
          },
          status: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          fathomCallId: callIdentifier
        }

        const result = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).insertOne(callRecord as CallRecord)

        // Process the call record for evaluation (async, don't wait for completion)
        CallEvaluationService.processCallRecord(result.insertedId.toString())
          .then(() => {
            console.log(`Successfully created evaluation for Fathom call: ${callIdentifier}`)
          })
          .catch((error) => {
            console.error(`Error creating evaluation for call ${callIdentifier}:`, error)
          })

        console.log(`Successfully processed Fathom call: ${callIdentifier}`)
        results.push({
          fathomCallId: callIdentifier,
          status: 'success',
          message: 'Call record created successfully',
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

function parseInviteesData(inviteesString: string, isNewFormat: boolean = false, inviteesArray?: unknown[]): Array<{
  email: string
  name: string
  isExternal: boolean
}> {
  // Handle new format with invitees array
  if (isNewFormat && inviteesArray && Array.isArray(inviteesArray)) {
    try {
      return inviteesArray.map((invitee: any) => ({
        email: invitee?.email || '',
        name: invitee?.name || invitee?.displayName || '',
        isExternal: invitee?.isExternal || invitee?.is_external === true || invitee?.is_external === 'True'
      }))
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