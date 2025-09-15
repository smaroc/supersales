import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import CallRecord from '@/models/CallRecord'
import User from '@/models/User'
import { CallEvaluationService } from '@/lib/services/call-evaluation-service'

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
    const body = await request.json()
    console.log('Received Fireflies webhook:', JSON.stringify(body, null, 2))

    // Convert single object to array for consistent processing
    const webhookDataArray = Array.isArray(body) ? body : [body]

    await dbConnect()

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
        const user = await User.findOne({
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

        // Check if call already exists
        const existingCall = await CallRecord.findOne({
          firefilesCallId: firefliesCallId,
          organizationId: user.organizationId
        })

        if (existingCall) {
          console.log(`Call already exists: ${firefliesCallId}`)
          results.push({
            firefliesCallId,
            status: 'skipped',
            message: 'Call already processed'
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

        // Create call record
        const callRecord = new CallRecord({
          organizationId: user.organizationId,
          salesRepId: user._id,
          salesRepName: `${user.firstName} ${user.lastName}`,
          firefilesCallId: firefliesCallId,
          title: meetingTitle || 'Untitled Meeting',
          scheduledStartTime: meetingStartTime,
          scheduledEndTime: meetingEndTime,
          actualDuration: actualDuration || 0,
          scheduledDuration: actualDuration || 0, // Fireflies doesn't provide scheduled duration
          transcript: transcriptText,
          recordingUrl: transcriptUrl, // Using transcript URL as recording URL
          shareUrl: transcriptUrl,
          source: 'firefiles',
          invitees,
          hasExternalInvitees,
          metadata: {
            firefliesTranscriptId: firefliesCallId,
            meetingLink,
            calendarId: transcript.calendar_id,
            participantEmails: transcript.participants,
            totalSentences: sentences.length
          },
          status: 'pending_evaluation'
        })

        await callRecord.save()

        // Process the call record for evaluation (async, don't wait for completion)
        CallEvaluationService.processCallRecord((callRecord as any)._id.toString())
          .then((evaluation) => {
            console.log(`Successfully created evaluation for Fireflies call: ${firefliesCallId}`)
          })
          .catch((error) => {
            console.error(`Error creating evaluation for call ${firefliesCallId}:`, error)
          })

        console.log(`Successfully processed Fireflies call: ${firefliesCallId}`)
        results.push({
          firefliesCallId,
          status: 'success',
          message: 'Call record created successfully',
          callRecordId: (callRecord as any)._id
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