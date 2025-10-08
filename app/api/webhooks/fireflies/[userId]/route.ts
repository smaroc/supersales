import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/mongodb'
import { CallRecord, CallEvaluation, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const resolvedParams = await params
    const { userId } = resolvedParams

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const data = await request.json()
    console.log('Fireflies webhook data for user', userId, ':', JSON.stringify(data, null, 2))

    // Verify the user exists
    const { db } = await connectToDatabase()
    const user = await db.collection(COLLECTIONS.USERS).findOne({
      clerkId: userId
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Handle array format from Fireflies
    const callsData = Array.isArray(data) ? data : [data]
    const results = []

    for (const callDataWrapper of callsData) {
      const transcript = callDataWrapper.data?.transcript
      if (!transcript) {
        console.log('No transcript data found in webhook payload')
        continue
      }

      // Convert sentences to readable transcript
      const transcriptText = transcript.sentences
        ?.map((sentence: any) => `${sentence.speaker_name}: ${sentence.text}`)
        .join('\n') || ''

      // Determine external invitees (different domain than host)
      const hostDomain = transcript.host_email?.split('@')[1] || ''
      const hasExternalInvitees = transcript.participants?.some((email: string) =>
        email.split('@')[1] !== hostDomain
      ) || false

      // Create CallRecord
      const callRecord: Omit<CallRecord, '_id'> = {
        organizationId: user.organizationId,
        userId: user._id,
        salesRepId: user.clerkId,
        salesRepName: `${user.firstName} ${user.lastName}`,
        source: 'fireflies',
        firefliesCallId: transcript.id,
        title: transcript.title || 'Fireflies Meeting',
        scheduledStartTime: transcript.date ? new Date(transcript.date) : new Date(),
        scheduledEndTime: transcript.date ? new Date(transcript.date + (transcript.duration * 60000)) : new Date(),
        actualDuration: transcript.duration || 0,
        scheduledDuration: transcript.duration || 0,
        transcript: transcriptText,
        recordingUrl: transcript.transcript_url || '',
        shareUrl: '',
        invitees: transcript.participants?.map((email: string) => ({
          email,
          name: transcript.meeting_attendees?.find((attendee: any) => attendee.email === email)?.displayName || email,
          isExternal: email.split('@')[1] !== hostDomain
        })) || [],
        hasExternalInvitees,
        metadata: {
          hostEmail: transcript.host_email,
          organizerEmail: transcript.organizer_email,
          meetingLink: transcript.meeting_link,
          calendarId: transcript.calendar_id,
          meetingAttendees: transcript.meeting_attendees,
          hasExternalInvitees
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).insertOne(callRecord)

      // Trigger evaluation processing
      try {
        const evaluationResponse = await fetch(`${request.nextUrl.origin}/api/call-records/${result.insertedId}/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })

        if (evaluationResponse.ok) {
          console.log(`Evaluation triggered for call record ${result.insertedId}`)
        }
      } catch (evalError) {
        console.error('Error triggering evaluation:', evalError)
      }

      results.push({
        callRecordId: result.insertedId,
        firefliesId: transcript.id
      })
    }

    console.log(`Fireflies webhook processed for user ${userId}:`, results)

    return NextResponse.json({
      success: true,
      processed: results.length,
      callRecords: results
    })

  } catch (error) {
    console.error('Error processing Fireflies webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}