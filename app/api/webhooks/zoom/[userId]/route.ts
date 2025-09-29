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
      clerkId: userId
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Process Zoom webhook data
    const callRecord: Omit<CallRecord, '_id'> = {
      organizationId: user.organizationId,
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