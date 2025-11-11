import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/mongodb'
import { CallRecord, COLLECTIONS } from '@/lib/types'
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

    // Verify the user exists
    const { db } = await connectToDatabase()
    const user = await db.collection(COLLECTIONS.USERS).findOne({
      _id: new ObjectId(userId),
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Extract meeting details for duplicate checking
    const zoomMeetingId = data.payload?.object?.id
    const meetingTopic = data.payload?.object?.topic || 'Zoom Meeting'
    const startTime = data.payload?.object?.start_time

    // Check if call already exists FOR THIS SPECIFIC USER
    // Same call can be processed for different users (e.g., multiple sales reps on the same call)
    const existingCall = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).findOne({
      $and: [
        {
          $or: [
            { zoomCallId: zoomMeetingId },
            // Also check by title and time to avoid duplicates if ID is missing
            ...(meetingTopic && startTime ? [{
              title: meetingTopic,
              scheduledStartTime: new Date(startTime)
            }] : [])
          ]
        },
        // IMPORTANT: Also check that this specific user hasn't already processed this call
        { 
          salesRepId: user._id?.toString()
        }
      ]
    })

    if (existingCall) {
      console.log(`Call already exists for this user: ${zoomMeetingId} - User: ${user.clerkId}`)
      return NextResponse.json({
        success: true,
        status: 'skipped',
        message: 'Call already processed for this user',
        callRecordId: existingCall._id
      })
    }

    console.log(`Processing new call for user ${user.clerkId}: ${zoomMeetingId}`)

    // Process Zoom webhook data
    const callRecord: Omit<CallRecord, '_id'> = {
      organizationId: user.organizationId,
      userId: user._id,
      salesRepId: user.clerkId,
      salesRepName: `${user.firstName} ${user.lastName}`,
      source: 'zoom',
      zoomCallId: data.payload?.object?.id,
      title: data.payload?.object?.topic || 'Zoom Meeting',
      scheduledStartTime: new Date(data.payload?.object?.start_time || Date.now()),
      scheduledEndTime: new Date(data.payload?.object?.start_time ?
        new Date(data.payload.object.start_time).getTime() + (data.payload?.object?.duration * 60000) :
        Date.now()),
      actualDuration: data.payload?.object?.duration || 0,
      scheduledDuration: data.payload?.object?.duration || 0,
      transcript: '', // Zoom doesn't provide transcript directly
      recordingUrl: data.payload?.object?.recording_files?.[0]?.download_url || '',
      shareUrl: data.payload?.object?.share_url || '',
      invitees: (data.payload?.object?.participant_user_names || []).map((name: string) => ({
        email: '',
        name,
        isExternal: false
      })),
      hasExternalInvitees: false,
      metadata: {
        meetingId: data.payload?.object?.id,
        hostEmail: data.payload?.object?.host_email,
        recordingFiles: data.payload?.object?.recording_files || []
      },
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Save the call record
    const result = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).insertOne(callRecord)

    console.log(`Zoom webhook processed for user ${userId}:`, result.insertedId)

    return NextResponse.json({
      success: true,
      callRecordId: result.insertedId
    })

  } catch (error) {
    console.error('Error processing Zoom webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}