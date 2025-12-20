import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/mongodb'
import { CallRecord, User, COLLECTIONS } from '@/lib/types'
import { CallEvaluationService } from '@/lib/services/call-evaluation-service'
import { inngest } from '@/lib/inngest.config'
import { DuplicateCallDetectionService } from '@/lib/services/duplicate-call-detection-service'

interface FirefliesWebhookData {
  data: {
    transcript: {
      id: string
      title: string
      host_email: string
      organizer_email: string
      meeting_link: string
      calendar_id: string
      participants: string[]
      date: number // Unix timestamp in milliseconds
      transcript_url: string
      duration: number // Duration in minutes
      meeting_attendees: Array<{
        displayName: string | null
        email: string
        phoneNumber: string | null
        name: string | null
        location: string | null
      }>
      sentences: Array<{
        index: number
        speaker_name: string
        text: string
        start_time: number
        end_time: number
      }>
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Handle empty or malformed request bodies
    const text = await request.text()
    if (!text || text.trim() === '') {
      console.log('Received empty Fireflies webhook request')
      return NextResponse.json({
        message: 'Empty request body',
        status: 'ignored'
      })
    }

    let body
    try {
      body = JSON.parse(text)
    } catch (parseError) {
      console.error('Invalid JSON in Fireflies webhook:', parseError)
      return NextResponse.json(
        {
          error: 'Invalid JSON format',
          message: 'Request body must be valid JSON'
        },
        { status: 400 }
      )
    }

    console.log('Received Fireflies webhook:', JSON.stringify(body, null, 2))

    // Convert single object to array for consistent processing
    const webhookDataArray = Array.isArray(body) ? body : [body]

    const { db } = await connectToDatabase()

    const results = []

    for (const webhookData of webhookDataArray as FirefliesWebhookData[]) {
      try {
        const transcript = webhookData.data?.transcript

        if (!transcript) {
          console.error('Missing transcript data in webhook')
          results.push({
            firefliesCallId: 'unknown',
            status: 'error',
            message: 'Missing transcript data'
          })
          continue
        }

        // Extract and validate required fields
        const {
          id: firefliesCallId,
          title: meetingTitle,
          host_email: hostEmail,
          organizer_email: organizerEmail,
          meeting_link: meetingLink,
          date: meetingDate,
          transcript_url: transcriptUrl,
          duration: actualDuration,
          meeting_attendees: attendees,
          sentences
        } = transcript

        if (!firefliesCallId || (!hostEmail && !organizerEmail)) {
          console.error('Missing required fields:', { firefliesCallId, hostEmail, organizerEmail })
          results.push({
            firefliesCallId: firefliesCallId || 'unknown',
            status: 'error',
            message: 'Missing required fields'
          })
          continue
        }

        // Try to find user by host email first, then organizer email
        const userEmail = hostEmail || organizerEmail
        const user = await db.collection<User>(COLLECTIONS.USERS).findOne({
          email: userEmail.toLowerCase().trim(),
          isActive: true
        })

        if (!user) {
          console.warn(`User not found for email: ${userEmail}`)
          results.push({
            firefliesCallId,

            status: 'warning',
            message: 'User not found in system'
          })
          continue
        }

        // Parse attendees information
        const invitees = parseAttendeesData(attendees, userEmail)

        // Check if call already exists using enhanced duplicate detection
        // Duplicate check is per-sales-rep: same call can exist for different reps
        const duplicateCheck = await DuplicateCallDetectionService.checkForDuplicate(db, {
          organizationId: user.organizationId,
          salesRepId: user._id?.toString() || '',
          scheduledStartTime: new Date(meetingDate),
          salesRepEmail: userEmail,
          salesRepName: `${user.firstName} ${user.lastName}`,
          leadEmails: invitees.map(i => i.email).filter(Boolean),
          leadNames: invitees.map(i => i.name).filter(Boolean),
          firefliesCallId
        })

        if (duplicateCheck.isDuplicate) {
          console.log(`Call already exists: ${firefliesCallId} (${duplicateCheck.matchType}: ${duplicateCheck.message})`)
          results.push({
            firefliesCallId,
            status: 'skipped',
            message: duplicateCheck.message,
            existingCallId: duplicateCheck.existingCallId
          })
          continue
        }

        // Convert Unix timestamp to Date objects
        const meetingStartTime = new Date(meetingDate)
        const meetingEndTime = new Date(meetingDate + (actualDuration * 60 * 1000))

        // Generate transcript from sentences
        const transcriptText = sentences
          .map(sentence => `${sentence.speaker_name}: ${sentence.text}`)
          .join('\n')

        // Determine if there are external invitees
        const hasExternalInvitees = invitees.some(invitee => invitee.isExternal)

        // Create call record - build it dynamically to avoid undefined/null field issues
        const callRecord: any = {
          organizationId: user.organizationId,
          salesRepId: user._id?.toString() || '',
          salesRepName: `${user.firstName} ${user.lastName}`,
          firefliesCallId: firefliesCallId,
          title: meetingTitle || 'Untitled Meeting',
          scheduledStartTime: meetingStartTime,
          scheduledEndTime: meetingEndTime,
          actualDuration: actualDuration || 0,
          scheduledDuration: actualDuration || 0, // Fireflies doesn't provide scheduled duration
          transcript: transcriptText,
          recordingUrl: transcriptUrl, // Using transcript URL as recording URL
          shareUrl: transcriptUrl,
          source: 'fireflies',
          invitees,
          hasExternalInvitees,
          metadata: {
            firefliesTranscriptId: firefliesCallId,
            meetingLink,
            calendarId: transcript.calendar_id,
            participantEmails: transcript.participants,
            totalSentences: sentences.length
          },
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        }

        const result = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).insertOne(callRecord)

        // Trigger Inngest function to process the call record asynchronously
        await inngest.send({
          name: 'call/process',
          data: {
            callRecordId: result.insertedId.toString(),
            source: 'fireflies' as const,
          },
        })

        console.log(`Successfully queued Fireflies call for processing: ${firefliesCallId}`)
        results.push({
          firefliesCallId,
          status: 'success',
          message: 'Call record created successfully',
          callRecordId: result.insertedId
        })

      } catch (error) {
        console.error(`Error processing call ${webhookData.data?.transcript?.id}:`, error)
        results.push({
          firefliesCallId: webhookData.data?.transcript?.id || 'unknown',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: 'Webhook processed',
      results,
      totalProcessed: webhookDataArray.length,
      successful: results.filter(r => r.status === 'success').length,
      errors: results.filter(r => r.status === 'error').length,
      warnings: results.filter(r => r.status === 'warning').length,
      skipped: results.filter(r => r.status === 'skipped').length
    })

  } catch (error) {
    console.error('Fireflies webhook error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function parseAttendeesData(
  attendees: Array<{
    displayName: string | null
    email: string
    phoneNumber: string | null
    name: string | null
    location: string | null
  }>,
  hostEmail: string
): Array<{
  email: string
  name: string
  isExternal: boolean
}> {
  if (!attendees || !Array.isArray(attendees)) return []

  return attendees
    .filter(attendee => attendee.email && attendee.email !== hostEmail) // Exclude host
    .map(attendee => {
      // Determine if external based on email domain
      const hostDomain = hostEmail.split('@')[1]
      const attendeeDomain = attendee.email.split('@')[1]
      const isExternal = hostDomain !== attendeeDomain

      return {
        email: attendee.email,
        name: attendee.displayName || attendee.name || attendee.email.split('@')[0],
        isExternal
      }
    })
}