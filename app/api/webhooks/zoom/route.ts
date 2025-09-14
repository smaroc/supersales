import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { Integration } from '@/lib/models/integration'
import { Transcription } from '@/lib/models/transcription'
import { ZoomService } from '@/lib/services/zoom-service'
import crypto from 'crypto'

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

    await dbConnect()

    // Handle different Zoom webhook events
    const { event, payload: eventPayload } = payload

    switch (event) {
      case 'recording.completed':
        return await handleRecordingCompleted(eventPayload)
      
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

async function handleRecordingCompleted(payload: any) {
  const { object } = payload
  const { uuid, id, topic, start_time, duration, recording_files } = object

  // Find the integration for this meeting host
  const integration = await Integration.findOne({
    platform: 'zoom',
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
    
    // Create transcription record
    const transcription = new Transcription({
      userId: integration.userId,
      organizationId: integration.organizationId,
      integrationId: integration._id,
      platform: 'zoom',
      externalId: uuid,
      title: topic || `Zoom Meeting ${id}`,
      duration: duration * 60, // Convert to seconds
      transcriptText: transcriptData.transcript,
      participants: transcriptData.participants || [],
      metadata: {
        recordedAt: new Date(start_time),
        processedAt: new Date(),
        language: 'en',
        platform: 'zoom',
        externalMeetingId: id,
        webhookData: payload
      },
      processingStatus: 'completed'
    })

    await transcription.save()

    // Update integration last sync
    integration.lastSync = new Date()
    integration.syncStatus = 'idle'
    await integration.save()

    console.log(`Processed Zoom recording: ${uuid}`)
    return NextResponse.json({ message: 'Recording processed successfully' })
  } catch (error) {
    console.error('Error processing Zoom recording:', error)
    
    // Update integration with error status
    integration.syncStatus = 'error'
    integration.syncError = error instanceof Error ? error.message : 'Unknown error'
    await integration.save()

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