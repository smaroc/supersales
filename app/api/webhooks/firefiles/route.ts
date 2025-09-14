import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { Integration } from '@/lib/models/integration'
import { Transcription } from '@/lib/models/transcription'
import { FirefilesService } from '@/lib/services/firefiles-service'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headers = request.headers

    // Verify webhook signature if configured
    const signature = headers.get('x-firefiles-signature')
    const timestamp = headers.get('x-firefiles-timestamp')

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

    // Find the integration
    const integration = await Integration.findOne({
      platform: 'firefiles',
      isActive: true
    }).select('+configuration.apiKey')

    if (!integration) {
      return NextResponse.json(
        { error: 'No active Firefiles integration found' },
        { status: 404 }
      )
    }

    // Verify signature if present
    if (signature && timestamp) {
      const apiKey = integration.configuration.apiKey
      if (apiKey) {
        const expectedSignature = crypto
          .createHmac('sha256', apiKey)
          .update(timestamp + body)
          .digest('hex')
        
        if (`v1=${expectedSignature}` !== signature) {
          return NextResponse.json(
            { error: 'Invalid webhook signature' },
            { status: 401 }
          )
        }
      }
    }

    // Handle different Firefiles webhook events
    const { event, data } = payload

    switch (event) {
      case 'transcription.completed':
        return await handleTranscriptionCompleted(data, integration)
      
      case 'recording.uploaded':
        return await handleRecordingUploaded(data, integration)
      
      case 'analysis.completed':
        return await handleAnalysisCompleted(data, integration)
      
      default:
        console.log(`Unhandled Firefiles webhook event: ${event}`)
        return NextResponse.json({ message: 'Event received' })
    }
  } catch (error) {
    console.error('Error processing Firefiles webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleTranscriptionCompleted(data: any, integration: any) {
  const { 
    recording_id, 
    title, 
    transcript, 
    participants, 
    duration, 
    recorded_at,
    analysis 
  } = data

  const firefilesService = new FirefilesService()
  
  try {
    // Get additional recording details if needed
    const recordingDetails = await firefilesService.getRecordingDetails(recording_id)
    
    // Create or update transcription record
    const existingTranscription = await Transcription.findOne({
      platform: 'firefiles',
      externalId: recording_id
    })

    const transcriptionData = {
      userId: integration.userId,
      organizationId: integration.organizationId,
      integrationId: integration._id,
      platform: 'firefiles',
      externalId: recording_id,
      title: title || `Firefiles Recording ${recording_id}`,
      duration: duration || 0,
      transcriptText: transcript || '',
      participants: participants || [],
      insights: {
        sentiment: analysis?.sentiment || 'neutral',
        confidence: analysis?.confidence || 0,
        keyTopics: analysis?.topics || [],
        actionItems: analysis?.action_items || [],
        questions: analysis?.questions || [],
        followUps: analysis?.follow_ups || []
      },
      metadata: {
        recordedAt: recorded_at ? new Date(recorded_at) : new Date(),
        processedAt: new Date(),
        language: recordingDetails?.language || 'en',
        platform: 'firefiles',
        webhookData: data
      },
      processingStatus: 'completed'
    }

    let transcription
    if (existingTranscription) {
      transcription = await Transcription.findByIdAndUpdate(
        existingTranscription._id,
        transcriptionData,
        { new: true }
      )
    } else {
      transcription = new Transcription(transcriptionData)
      await transcription.save()
    }

    // Update integration last sync
    integration.lastSync = new Date()
    integration.syncStatus = 'idle'
    await integration.save()

    console.log(`Processed Firefiles recording: ${recording_id}`)
    return NextResponse.json({ message: 'Recording processed successfully' })
  } catch (error) {
    console.error('Error processing Firefiles recording:', error)
    
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

async function handleRecordingUploaded(data: any, integration: any) {
  const { recording_id, status } = data
  
  // Create pending transcription record
  const existingTranscription = await Transcription.findOne({
    platform: 'firefiles',
    externalId: recording_id
  })

  if (!existingTranscription) {
    const transcription = new Transcription({
      userId: integration.userId,
      organizationId: integration.organizationId,
      integrationId: integration._id,
      platform: 'firefiles',
      externalId: recording_id,
      title: `Firefiles Recording ${recording_id}`,
      duration: 0,
      transcriptText: '',
      metadata: {
        recordedAt: new Date(),
        platform: 'firefiles',
        webhookData: data
      },
      processingStatus: status === 'processing' ? 'processing' : 'pending'
    })

    await transcription.save()
  }

  console.log(`Firefiles recording uploaded: ${recording_id}`)
  return NextResponse.json({ message: 'Recording upload event received' })
}

async function handleAnalysisCompleted(data: any, integration: any) {
  const { recording_id, analysis } = data

  // Update existing transcription with analysis
  await Transcription.findOneAndUpdate(
    {
      platform: 'firefiles',
      externalId: recording_id
    },
    {
      insights: {
        sentiment: analysis?.sentiment || 'neutral',
        confidence: analysis?.confidence || 0,
        keyTopics: analysis?.topics || [],
        actionItems: analysis?.action_items || [],
        questions: analysis?.questions || [],
        followUps: analysis?.follow_ups || []
      },
      processingStatus: 'completed'
    }
  )

  console.log(`Firefiles analysis completed: ${recording_id}`)
  return NextResponse.json({ message: 'Analysis completed event received' })
}