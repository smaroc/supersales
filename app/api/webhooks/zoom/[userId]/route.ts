import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/mongodb'
import { CallRecord, User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'
import { DuplicateCallDetectionService } from '@/lib/services/duplicate-call-detection-service'
import { inngest } from '@/lib/inngest.config'
import { tinybirdIngestCallRecord } from '@/lib/tinybird-ingest'

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

    // Verify the user exists - userId could be MongoDB ObjectId or Clerk ID
    const { db } = await connectToDatabase()
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId)

    const user = await db.collection(COLLECTIONS.USERS).findOne({
      ...(isValidObjectId
        ? { _id: new ObjectId(userId) }
        : { clerkId: userId }
      ),
    })

    if (!user) {
      console.warn(`User not found for userId: ${userId} (searched by ${isValidObjectId ? '_id' : 'clerkId'})`)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Extract meeting details for duplicate checking
    const zoomMeetingId = data.payload?.object?.id
    const meetingTopic = data.payload?.object?.topic || 'Zoom Meeting'
    const startTime = data.payload?.object?.start_time
    const hostEmail = data.payload?.object?.host_email

    // Parse invitees
    const invitees = (data.payload?.object?.participant_user_names || []).map((name: string) => ({
      email: '',
      name,
      isExternal: false
    }))

    // Resolve the actual sales rep from the webhook data
    // This handles the case where webhook comes from Head of Sales integration
    // but the call belongs to a specific sales rep
    const salesRepResolution = await DuplicateCallDetectionService.resolveSalesRep({
      db,
      organizationId: user.organizationId,
      salesRepEmail: hostEmail,
      fallbackUserId: user._id
    })

    const actualSalesRep = salesRepResolution.user || user
    console.log(`Sales rep resolved: ${actualSalesRep.firstName} ${actualSalesRep.lastName} (${actualSalesRep.email}) - resolved by: ${salesRepResolution.resolvedBy}`)

    // Check if call already exists using enhanced duplicate detection
    // Duplicate check is per-sales-rep: same call can exist for different reps
    const duplicateCheck = await DuplicateCallDetectionService.checkForDuplicate(db, {
      organizationId: user.organizationId,
      salesRepId: actualSalesRep._id?.toString() || '',
      scheduledStartTime: startTime ? new Date(startTime) : new Date(),
      meetingTitle: meetingTopic,
      salesRepEmail: hostEmail,
      salesRepName: `${actualSalesRep.firstName} ${actualSalesRep.lastName}`,
      leadEmails: invitees.map((i: any) => i.email).filter(Boolean),
      leadNames: invitees.map((i: any) => i.name).filter(Boolean),
      zoomCallId: zoomMeetingId
    })

    if (duplicateCheck.isDuplicate) {
      console.log(`Zoom call already exists: ${zoomMeetingId} (${duplicateCheck.matchType}: ${duplicateCheck.message})`)
      return NextResponse.json({
        success: true,
        status: 'skipped',
        message: duplicateCheck.message,
        existingCallId: duplicateCheck.existingCallId
      })
    }

    console.log(`Processing new call for sales rep ${actualSalesRep._id?.toString()}: ${zoomMeetingId}`)

    // Process Zoom webhook data - assign to the resolved sales rep
    const callRecord: Omit<CallRecord, '_id'> = {
      organizationId: user.organizationId,
      userId: actualSalesRep._id!,
      salesRepId: actualSalesRep._id?.toString() || '',
      salesRepName: `${actualSalesRep.firstName} ${actualSalesRep.lastName}`,
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
      invitees,
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
    const result = await db.collection(COLLECTIONS.CALL_RECORDS).insertOne(callRecord)

    // Dual-write to Tinybird (non-blocking, fails silently)
    await tinybirdIngestCallRecord({ ...callRecord, _id: result.insertedId } as CallRecord)

    // Trigger Inngest function to process the call record asynchronously
    await inngest.send({
      name: 'call/process',
      data: {
        callRecordId: result.insertedId.toString(),
        source: 'zoom' as const,
      },
    })

    console.log(`Successfully queued Zoom call for processing: ${zoomMeetingId}`)

    return NextResponse.json({
      success: true,
      callRecordId: result.insertedId,
      status: 'success',
      message: 'Call record created and queued for processing'
    })

  } catch (error) {
    console.error('Error processing Zoom webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}