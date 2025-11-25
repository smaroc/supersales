import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/mongodb'
import { CallRecord, User, Integration, COLLECTIONS } from '@/lib/types'
import { CallEvaluationService } from '@/lib/services/call-evaluation-service'
import { analyzeCallAction } from '@/app/actions/call-analysis'
import { decrypt } from '@/lib/encryption'
import { ObjectId } from 'mongodb'

interface ClaapWebhookData {
  eventId: string
  event: {
    type: string // "recording_added"
    recording: {
      id: string
      title: string
      createdAt: string
      durationSeconds: number
      url?: string
      participants?: Array<{
        id?: string
        email?: string
        name?: string
        role?: string
      }>
      transcripts?: Array<{
        isActive?: boolean
        isTranscript?: boolean
        langIso2?: string
        textUrl?: string  // URL to fetch plain text transcript
        url?: string      // URL to fetch JSON transcript
      }>
      video?: {
        url?: string
      }
      recorder?: {
        attended?: boolean
        id?: string
        email?: string
        name?: string
      }
      meeting?: {
        startingAt?: string
        endingAt?: string
        type?: string
        participants?: Array<{
          attended?: boolean
          id?: string
          email?: string
          name?: string
        }>
      }
      keyTakeaways?: Array<{
        langIso2?: string
        text?: string
      }>
      outlines?: Array<{
        langIso2?: string
        text?: string
      }>
      actionItems?: Array<{
        items?: Array<{
          isChecked?: boolean
          description?: string
        }>
        langIso2?: string
      }>
      workspace?: {
        id?: string
        name?: string
      }
      channel?: {
        id?: string
        name?: string
      }
    }
  }
  [key: string]: unknown
}

interface TranscriptSegment {
  speaker?: string
  text?: string
  startTime?: number
  endTime?: number
  timestamp?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  console.log('=== CLAAP WEBHOOK REQUEST START ===')
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

    // Get webhook headers for validation
    const webhookSecret = request.headers.get('x-claap-webhook-secret')
    const webhookId = request.headers.get('x-claap-webhook-id')

    console.log('Webhook Secret present:', !!webhookSecret)
    console.log('Webhook ID:', webhookId)

    const body = await request.json()
    console.log('Received Claap webhook body for user', userId, ':', JSON.stringify(body, null, 2))

    const { db } = await connectToDatabase()

    // Find the user by clerk ID (userId from URL)
    const user = await db.collection<User>(COLLECTIONS.USERS).findOne({
      _id: new ObjectId(userId),
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

    // Handle both array and single object formats
    const webhookDataArray = Array.isArray(body) ? body : [body]

    console.log('Normalized to array format, processing', webhookDataArray.length, 'items')

    const results = []

    for (const webhookData of webhookDataArray as ClaapWebhookData[]) {
      try {
        console.log('=== PROCESSING INDIVIDUAL WEBHOOK ITEM ===')
        console.log('Event ID:', webhookData.eventId)
        console.log('Event type:', webhookData.event?.type)

        // Validate event type
        if (webhookData.event?.type !== 'recording_added') {
          console.warn(`Unsupported event type: ${webhookData.event?.type}`)
          results.push({
            eventId: webhookData.eventId,
            status: 'warning',
            message: `Unsupported event type: ${webhookData.event?.type}`
          })
          continue
        }

        // Check channel filtering
        const integration = await db.collection<Integration>(COLLECTIONS.INTEGRATIONS).findOne({
          userId: user._id,
          platform: 'claap',
          isActive: true
        })

        if (integration?.configuration?.selectedChannels) {
          try {
            const selectedChannels = JSON.parse(integration.configuration.selectedChannels)
            const recordingChannelId = webhookData.event.recording.channel?.id

            // If channels are selected and this recording's channel is not in the list, skip it
            if (selectedChannels.length > 0 && recordingChannelId && !selectedChannels.includes(recordingChannelId)) {
              console.log(`Skipping recording from unselected channel: ${webhookData.event.recording.channel?.name} (${recordingChannelId})`)
              results.push({
                eventId: webhookData.eventId,
                recordingId: webhookData.event.recording.id,
                status: 'skipped',
                message: `Channel not selected for analysis: ${webhookData.event.recording.channel?.name}`
              })
              continue
            }
          } catch (error) {
            console.error('Error parsing selectedChannels:', error)
            // Continue processing if there's an error parsing (fail open)
          }
        }

        const recording = webhookData.event.recording
        if (!recording || !recording.id) {
          console.error('Missing recording data in webhook')
          results.push({
            eventId: webhookData.eventId,
            status: 'error',
            message: 'Missing recording data'
          })
          continue
        }

        const recordingId = recording.id
        const title = recording.title || 'Untitled Claap'
        const durationSeconds = recording.durationSeconds || 0

        // Use meeting times if available, otherwise use recording creation time
        const meetingStartTime = recording.meeting?.startingAt
          ? new Date(recording.meeting.startingAt)
          : (recording.createdAt ? new Date(recording.createdAt) : new Date())

        const meetingEndTime = recording.meeting?.endingAt
          ? new Date(recording.meeting.endingAt)
          : new Date(meetingStartTime.getTime() + (durationSeconds * 1000))

        // Fetch transcript from URL if available
        let transcript = ''

        // Find the active transcript (transcripts is now an array)
        const activeTranscript = recording.transcripts?.find(t => t.isActive && t.isTranscript)

        if (activeTranscript?.textUrl) {
          // Prefer textUrl for plain text format
          console.log('Fetching transcript from textUrl:', activeTranscript.textUrl)
          try {
            const transcriptResponse = await fetch(activeTranscript.textUrl)
            if (transcriptResponse.ok) {
              transcript = await transcriptResponse.text()
              console.log('Transcript fetched successfully from textUrl, length:', transcript.length)
            } else {
              console.error('Failed to fetch transcript from textUrl:', transcriptResponse.status, transcriptResponse.statusText)
            }
          } catch (error) {
            console.error('Error fetching transcript from textUrl:', error)
          }
        } else if (activeTranscript?.url) {
          // Fallback to JSON url
          console.log('Fetching transcript from JSON url:', activeTranscript.url)
          try {
            const transcriptResponse = await fetch(activeTranscript.url)
            if (transcriptResponse.ok) {
              const transcriptData = await transcriptResponse.json()

              // Handle different transcript formats
              if (Array.isArray(transcriptData)) {
                // Array of transcript segments
                transcript = transcriptData
                  .map((segment: TranscriptSegment) => {
                    const speaker = segment.speaker || 'Unknown'
                    const startTime = segment.startTime ? formatTime(segment.startTime) :
                      segment.timestamp || '00:00:00'
                    const text = segment.text || ''
                    return `[${startTime}] ${speaker}: ${text}`
                  })
                  .join('\n')
              } else if (transcriptData.segments && Array.isArray(transcriptData.segments)) {
                // Object with segments array
                transcript = transcriptData.segments
                  .map((segment: TranscriptSegment) => {
                    const speaker = segment.speaker || 'Unknown'
                    const startTime = segment.startTime ? formatTime(segment.startTime) :
                      segment.timestamp || '00:00:00'
                    const text = segment.text || ''
                    return `[${startTime}] ${speaker}: ${text}`
                  })
                  .join('\n')
              } else if (transcriptData.text) {
                // Simple text format
                transcript = transcriptData.text
              } else {
                // If JSON format is not recognized, stringify it for logging
                console.log('Unexpected transcript JSON format:', JSON.stringify(transcriptData).substring(0, 500))
              }

              console.log('Transcript fetched successfully from JSON url, length:', transcript.length)
            } else {
              console.error('Failed to fetch transcript from JSON url:', transcriptResponse.status, transcriptResponse.statusText)
            }
          } catch (error) {
            console.error('Error fetching transcript from JSON url:', error)
          }
        }

        if (!transcript) {
          console.warn('No transcript could be fetched from Claap webhook')
        }

        // Extract recording URLs
        const recordingUrl = recording.video?.url || recording.url || ''
        const shareUrl = recording.url || recordingUrl // Use the main recording URL

        // Parse participants - use meeting.participants if available, fallback to recording.participants
        const meetingParticipants = recording.meeting?.participants || recording.participants || []
        const participants = meetingParticipants.map(p => ({
          email: p.email || '',
          name: p.name || '',
          isExternal: !p.email || !p.email.includes(user.email.split('@')[1] || '')
        }))

        const hasExternalInvitees = participants.some(p => p.isExternal)

        // Check if call already exists FOR THIS SPECIFIC USER
        const existingCall = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).findOne({
          $and: [
            { claapCallId: recordingId },
            { salesRepId: user._id?.toString() }
          ]
        })

        if (existingCall) {
          console.log(`Call already exists for this user: ${recordingId} - User: ${user._id?.toString()}`)
          results.push({
            eventId: webhookData.eventId,
            recordingId,
            status: 'skipped',
            message: 'Call already processed for this user'
          })
          continue
        }

        console.log(`Processing new call for user ${user._id?.toString()}: ${recordingId}`)

        // Create call record
        const callRecord: Partial<CallRecord> = {
          organizationId: user.organizationId,
          salesRepId: user._id?.toString() || '',
          salesRepName: `${user.firstName} ${user.lastName}`,
          source: 'claap' as const,
          title: title,
          scheduledStartTime: meetingStartTime,
          scheduledEndTime: meetingEndTime,
          actualDuration: durationSeconds / 60, // Convert seconds to minutes
          scheduledDuration: Math.round(durationSeconds / 60),
          transcript: transcript || '',
          recordingUrl: recordingUrl,
          shareUrl: shareUrl,
          invitees: participants,
          hasExternalInvitees: hasExternalInvitees,
          metadata: {
            claapEventId: webhookData.eventId,
            claapWebhookId: webhookId || '',
            claapKeyTakeaways: recording.keyTakeaways || [],
            claapOutlines: recording.outlines || [],
            claapActionItems: recording.actionItems || [],
            claapWorkspace: recording.workspace || {},
            claapChannel: recording.channel || {},
            claapRecorder: recording.recorder || {},
            claapMeetingType: recording.meeting?.type || '',
            transcriptTextUrl: activeTranscript?.textUrl || '',
            transcriptJsonUrl: activeTranscript?.url || '',
            transcriptLanguage: activeTranscript?.langIso2 || '',
          },
          status: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          claapCallId: recordingId
        }

        const result = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).insertOne(callRecord as CallRecord)

        // Process the call record for OpenAI analysis using server action
        console.log(`=== STARTING OPENAI ANALYSIS VIA SERVER ACTION ===`)
        console.log(`Call Record ID: ${result.insertedId.toString()}`)
        console.log(`Recording ID: ${recordingId}`)
        console.log(`Transcript Length: ${(transcript || '').length} characters`)
        console.log(`Has Transcript: ${!!transcript && transcript.trim() !== ''}`)

        // Use server action for better serverless compatibility
        await analyzeCallAction(result.insertedId.toString())
          .then(() => {
            console.log(`=== OPENAI ANALYSIS SERVER ACTION COMPLETED ===`)
            console.log(`Call Record ID: ${result.insertedId.toString()}`)
            console.log(`Recording ID: ${recordingId}`)
          })
          .catch((error) => {
            console.error(`=== OPENAI ANALYSIS SERVER ACTION FAILED ===`)
            console.error(`Call Record ID: ${result.insertedId.toString()}`)
            console.error(`Recording ID: ${recordingId}`)
            console.error(`Error Type: ${error.constructor.name}`)
            console.error(`Error Message: ${error.message}`)
            console.error(`Full Error:`, error)
          })

        // Also process with traditional evaluation service for backward compatibility
        CallEvaluationService.processCallRecord(result.insertedId.toString())
          .then(() => {
            console.log(`Successfully created evaluation for Claap call: ${recordingId}`)
          })
          .catch((error) => {
            console.error(`Error creating evaluation for call ${recordingId}:`, error)
          })

        console.log(`Successfully processed Claap call: ${recordingId}`)
        results.push({
          eventId: webhookData.eventId,
          recordingId,
          status: 'success',
          message: 'Call record created successfully',
          callRecordId: result.insertedId
        })

      } catch (error) {
        const errorId = webhookData.eventId || 'unknown'
        console.error(`Error processing event ${errorId}:`, error)
        results.push({
          eventId: errorId,
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

    console.log('=== CLAAP WEBHOOK RESPONSE ===', response)
    console.log('=== CLAAP WEBHOOK REQUEST END ===')

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('=== CLAAP WEBHOOK ERROR ===', error)
    const errorResponse = {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
    console.log('=== CLAAP WEBHOOK ERROR RESPONSE ===', errorResponse)
    console.log('=== CLAAP WEBHOOK REQUEST END (ERROR) ===')

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

  console.log('=== CLAAP WEBHOOK GET REQUEST ===')
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

// Helper function to format time in seconds to HH:MM:SS
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
