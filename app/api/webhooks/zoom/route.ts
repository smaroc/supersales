import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/mongodb'
import { Integration, CallRecord, User, COLLECTIONS } from '@/lib/types'
import { ZoomService } from '@/lib/services/zoom-service'
import { DuplicateCallDetectionService } from '@/lib/services/duplicate-call-detection-service'
import { inngest } from '@/lib/inngest.config'
import crypto from 'crypto'
import { dualWriteCallRecord } from '@/lib/dual-write'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headers = request.headers

    // Verify webhook signature if configured
    const signature = headers.get('authorization')
    if (!signature) {
      console.warn('Zoom webhook received without authorization header')
    }

    let payload
    try {
      payload = JSON.parse(body)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()

    // Handle different Zoom webhook events
    const { event, payload: eventPayload } = payload

    switch (event) {
      case 'recording.completed':
        return await handleRecordingCompleted(eventPayload, db)

      case 'meeting.ended':
        return await handleMeetingEnded(eventPayload)

      default:
        console.log(`Unhandled Zoom webhook event: ${event}`)
        return NextResponse.json({ message: 'Event received' })
    }
  } catch (error) {
    console.error('Error processing Zoom webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleRecordingCompleted(payload: any, db: any) {
  const { object } = payload
  const { uuid, id, topic, start_time, duration, recording_files, host_email, participant_count } = object

  // Find user by host email
  const user = host_email ? await db.collection(COLLECTIONS.USERS).findOne({
    email: host_email.toLowerCase().trim(),
    isActive: true
  }) as User | null : null

  if (!user) {
    console.warn(`User not found for Zoom host email: ${host_email}`)
    return NextResponse.json({
      message: 'User not found in system',
      status: 'warning'
    })
  }

  // Find the integration for this meeting host
  const integration = await db.collection(COLLECTIONS.INTEGRATIONS).findOne({
    platform: 'zoom',
    organizationId: user.organizationId,
    isActive: true
  })

  if (!integration) {
    console.log('No active Zoom integration found for recording')
    return NextResponse.json({ message: 'No integration found' })
  }

  const zoomService = new ZoomService()

  try {
    // Get transcript from Zoom API
    const transcriptData = await zoomService.getTranscript(uuid)

    // Extract participant info if available
    const participants = transcriptData.participants || []
    const invitees = participants
      .filter((p: any) => p.email && p.email !== host_email)
      .map((p: any) => ({
        email: p.email,
        name: p.name || p.email.split('@')[0],
        isExternal: host_email ? p.email.split('@')[1] !== host_email.split('@')[1] : true
      }))

    const scheduledStartTime = start_time ? new Date(start_time) : new Date()

    // Check for duplicate using enhanced detection
    // Duplicate check is per-sales-rep: same call can exist for different reps
    const duplicateCheck = await DuplicateCallDetectionService.checkForDuplicate(db, {
      organizationId: user.organizationId,
      salesRepId: user._id?.toString() || '',
      scheduledStartTime,
      meetingTitle: topic || `Zoom Meeting ${id}`,
      salesRepEmail: host_email,
      salesRepName: `${user.firstName} ${user.lastName}`,
      leadEmails: invitees.map((i: any) => i.email).filter(Boolean),
      leadNames: invitees.map((i: any) => i.name).filter(Boolean),
      zoomCallId: uuid
    })

    if (duplicateCheck.isDuplicate) {
      console.log(`Zoom call already exists: ${uuid} (${duplicateCheck.matchType}: ${duplicateCheck.message})`)
      return NextResponse.json({
        message: duplicateCheck.message,
        status: 'skipped',
        existingCallId: duplicateCheck.existingCallId
      })
    }

    // Create call record
    const callRecord: any = {
      organizationId: user.organizationId,
      salesRepId: user._id?.toString() || '',
      salesRepName: `${user.firstName} ${user.lastName}`,
      zoomCallId: uuid,
      source: 'zoom',
      title: topic || `Zoom Meeting ${id}`,
      scheduledStartTime,
      scheduledEndTime: new Date(scheduledStartTime.getTime() + (duration * 60 * 1000)),
      actualDuration: duration,
      scheduledDuration: duration,
      transcript: transcriptData.transcript,
      invitees,
      hasExternalInvitees: invitees.some((i: any) => i.isExternal),
      metadata: {
        zoomMeetingId: id,
        zoomUuid: uuid,
        hostEmail: host_email,
        participantCount: participant_count,
        recordingFiles: recording_files?.map((f: any) => ({
          type: f.file_type,
          url: f.download_url,
          size: f.file_size
        }))
      },
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection(COLLECTIONS.CALL_RECORDS).insertOne(callRecord)

    // Dual-write to Tinybird (non-blocking, fails silently)
    await dualWriteCallRecord({ ...callRecord, _id: result.insertedId, userId: user._id! })

    // Trigger Inngest function to process the call record asynchronously
    await inngest.send({
      name: 'call/process',
      data: {
        callRecordId: result.insertedId.toString(),
        source: 'zoom' as const,
      },
    })

    // Update integration last sync
    await db.collection(COLLECTIONS.INTEGRATIONS).updateOne(
      { _id: integration._id },
      {
        $set: {
          lastSync: new Date(),
          syncStatus: 'idle',
          updatedAt: new Date()
        }
      }
    )

    console.log(`Successfully queued Zoom call for processing: ${uuid}`)
    return NextResponse.json({
      message: 'Recording processed successfully',
      callRecordId: result.insertedId
    })
  } catch (error) {
    console.error('Error processing Zoom recording:', error)

    // Update integration with error status
    await db.collection(COLLECTIONS.INTEGRATIONS).updateOne(
      { _id: integration._id },
      {
        $set: {
          syncStatus: 'error',
          syncError: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date()
        }
      }
    )

    return NextResponse.json(
      { error: 'Failed to process recording' },
      { status: 500 }
    )
  }
}

async function handleMeetingEnded(payload: any) {
  console.log('Zoom meeting ended:', payload.object.uuid)
  // Handle meeting end events if needed
  return NextResponse.json({ message: 'Meeting end event received' })
}