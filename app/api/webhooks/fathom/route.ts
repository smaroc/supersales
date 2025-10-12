import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/mongodb'
import { CallRecord, User, COLLECTIONS } from '@/lib/types'
import { CallEvaluationService } from '@/lib/services/call-evaluation-service'

interface FathomWebhookData {
  fathom_user_emaill?: string // Note: typo in the field name from Fathom
  fathom_user_name?: string
  fathom_user_team?: string
  id?: string
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
  // New nested format
  fathom_user?: {
    email?: string
    name?: string
    team?: string
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
  [key: string]: unknown
}

export async function POST(request: NextRequest) {
  console.log('=== FATHOM WEBHOOK REQUEST START (LEGACY EMAIL-BASED) ===')
  console.log('⚠️  DEPRECATED: Use /api/webhooks/fathom/[userId] for better security')
  console.log('Method:', request.method)
  console.log('URL:', request.url)
  console.log('Headers:', Object.fromEntries(request.headers.entries()))

  try {
    const body = await request.json()
    console.log('Received Fathom webhook body:', JSON.stringify(body, null, 2))

    // Handle both array and single object formats
    let webhookDataArray = Array.isArray(body) ? body : [body]

    // Check if the data is wrapped in a 'transcript' field as JSON string (alternative Fathom format)
    if (webhookDataArray[0]?.transcript && typeof webhookDataArray[0].transcript === 'string') {
      console.log('Detected Fathom format with transcript field as JSON string, parsing...')
      webhookDataArray = webhookDataArray.map(item => JSON.parse(item.transcript))
    }

    console.log('Normalized to array format, processing', webhookDataArray.length, 'items')

    const { db } = await connectToDatabase()

    const results = []

    for (const webhookData of webhookDataArray as FathomWebhookData[]) {
      try {
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

        if (!fathomCallId || !userEmail) {
          console.error('Missing required fields:', { fathomCallId, userEmail })
          results.push({
            fathomCallId: fathomCallId || 'unknown',
            status: 'error',
            message: 'Missing required fields'
          })
          continue
        }

        // Find the user in our system by email
        const user = await db.collection<User>(COLLECTIONS.USERS).findOne({
          email: userEmail.toLowerCase().trim(),
          isActive: true
        })

        if (!user) {
          console.warn(`User not found for email: ${userEmail}`)
          results.push({
            fathomCallId,
            status: 'warning',
            message: 'User not found in system'
          })
          continue
        }

        // Parse invitees information
        const invitees = parseInviteesData(inviteesData || '', webhookData.fathom_user ? true : false, webhookData.meeting?.invitees)

        // Check if call already exists
        const existingCall = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).findOne({
          fathomCallId,
          organizationId: user.organizationId
        })

        if (existingCall) {
          console.log(`Call already exists: ${fathomCallId}`)
          results.push({
            fathomCallId,
            status: 'skipped',
            message: 'Call already processed'
          })
          continue
        }

        // Create call record - build it dynamically to avoid undefined/null field issues
        // Use fathom_user.name as the sales rep name (closer) if available, otherwise use authenticated user
        const salesRepName = userName || `${user.firstName} ${user.lastName}`

        const callRecord: any = {
          organizationId: user.organizationId,
          salesRepId: user._id?.toString() || '',
          salesRepName: salesRepName,
          source: 'fathom',
          title: meetingTitle || 'Untitled Meeting',
          scheduledStartTime: scheduledStartTime ? new Date(scheduledStartTime) : new Date(),
          scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime) : new Date(),
          actualDuration: actualDuration ? parseFloat(actualDuration) : 0,
          scheduledDuration: scheduledDuration ? parseInt(scheduledDuration) : 0,
          transcript,
          recordingUrl,
          shareUrl,
          invitees,
          hasExternalInvitees: hasExternalInvitees === 'True',
          metadata: {
            fathomUserName: userName,
            fathomUserTeam: webhookData.fathom_user_team,
            meetingJoinUrl: webhookData.meeting_join_url,
            externalDomains: webhookData.meeting_external_domains
          },
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        }

        // Only set the fathomCallId if it exists
        if (fathomCallId) {
          callRecord.fathomCallId = fathomCallId
        }

        const result = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).insertOne(callRecord)

        // Process the call record for evaluation (async, don't wait for completion)
        CallEvaluationService.processCallRecord(result.insertedId.toString())
          .then(() => {
            console.log(`Successfully created evaluation for Fathom call: ${fathomCallId}`)
          })
          .catch((error) => {
            console.error(`Error creating evaluation for call ${fathomCallId}:`, error)
          })

        console.log(`Successfully processed Fathom call: ${fathomCallId}`)
        results.push({
          fathomCallId,
          status: 'success',
          message: 'Call record created successfully',
          callRecordId: result.insertedId
        })

      } catch (error) {
        console.error(`Error processing call ${webhookData.id}:`, error)
        results.push({
          fathomCallId: webhookData.id,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const response = {
      message: 'Webhook processed',
      results,
      totalProcessed: webhookDataArray.length,
      successful: results.filter(r => r.status === 'success').length,
      errors: results.filter(r => r.status === 'error').length,
      warnings: results.filter(r => r.status === 'warning').length,
      skipped: results.filter(r => r.status === 'skipped').length
    }

    console.log('=== FATHOM WEBHOOK RESPONSE ===', response)
    console.log('=== FATHOM WEBHOOK REQUEST END ===')

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('=== FATHOM WEBHOOK ERROR ===', error)
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
export async function GET(request: NextRequest) {
  console.log('=== FATHOM WEBHOOK GET REQUEST ===')
  console.log('URL:', request.url)
  console.log('Headers:', Object.fromEntries(request.headers.entries()))

  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests',
      method: request.method,
      url: request.url
    },
    { status: 405 }
  )
}

export async function PUT(request: NextRequest) {
  console.log('=== FATHOM WEBHOOK PUT REQUEST ===')
  console.log('URL:', request.url)

  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests',
      method: request.method
    },
    { status: 405 }
  )
}

export async function DELETE(request: NextRequest) {
  console.log('=== FATHOM WEBHOOK DELETE REQUEST ===')
  console.log('URL:', request.url)

  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests',
      method: request.method
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
      return inviteesArray.map((invitee) => {
        const inviteeObj = invitee as Record<string, unknown>
        return {
          email: (inviteeObj?.email as string) || '',
          name: (inviteeObj?.name as string) || (inviteeObj?.displayName as string) || '',
          isExternal: inviteeObj?.isExternal === true || inviteeObj?.is_external === true || inviteeObj?.is_external === 'True'
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