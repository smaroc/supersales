import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/mongodb'
import { CallRecord, User, COLLECTIONS } from '@/lib/types'
import { CallEvaluationService } from '@/lib/services/call-evaluation-service'

interface FathomWebhookData {
  fathom_user_emaill: string // Note: typo in the field name from Fathom
  fathom_user_name: string
  fathom_user_team: string
  id: string
  meeting_external_domains: string
  meeting_external_domains_domaine_name: string
  meeting_has_external_invitees: string
  meeting_invitees: string
  meeting_invitees_email: string
  meeting_invitees_is_external: string
  meeting_invitees_name: string
  meeting_join_url: string
  meeting_scheduled_duration_in_minute: string
  meeting_scheduled_end_time: string
  meeting_scheduled_start_time: string
  meeting_title: string
  recording_duration_in_minutes: string
  recording_share_url: string
  recording_url: string
  transcript_plaintext: string
}

export async function POST(request: NextRequest) {
  console.log('=== FATHOM WEBHOOK REQUEST START ===')
  console.log('Method:', request.method)
  console.log('URL:', request.url)
  console.log('Headers:', Object.fromEntries(request.headers.entries()))

  try {
    const body = await request.json()
    console.log('Received Fathom webhook body:', JSON.stringify(body, null, 2))

    // Validate that we received an array
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Expected array of webhook data' },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()

    const results = []

    for (const webhookData of body as FathomWebhookData[]) {
      try {
        // Extract and validate required fields
        const {
          id: fathomCallId,
          fathom_user_emaill: userEmail, // Note the typo in field name
          fathom_user_name: userName,
          meeting_title: meetingTitle,
          meeting_scheduled_start_time: scheduledStartTime,
          meeting_scheduled_end_time: scheduledEndTime,
          meeting_scheduled_duration_in_minute: scheduledDuration,
          recording_duration_in_minutes: actualDuration,
          recording_share_url: shareUrl,
          recording_url: recordingUrl,
          transcript_plaintext: transcript,
          meeting_invitees: inviteesData,
          meeting_has_external_invitees: hasExternalInvitees
        } = webhookData

        if (!fathomCallId || !userEmail) {
          console.error('Missing required fields:', { fathomCallId, userEmail })
          results.push({
            fathomCallId,
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
        const invitees = parseInviteesData(inviteesData)

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
        const callRecord: CallRecord = {
          organizationId: user.organizationId,
          salesRepId: user._id?.toString() || '',
          salesRepName: `${user.firstName} ${user.lastName}`,
          source: 'fathom',
          title: meetingTitle || 'Untitled Meeting',
          scheduledStartTime: new Date(scheduledStartTime),
          scheduledEndTime: new Date(scheduledEndTime),
          actualDuration: parseFloat(actualDuration) || 0,
          scheduledDuration: parseInt(scheduledDuration) || 0,
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
      totalProcessed: body.length,
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

function parseInviteesData(inviteesString: string): Array<{
  email: string
  name: string
  isExternal: boolean
}> {
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