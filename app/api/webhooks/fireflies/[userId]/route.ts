import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/mongodb'
import { CallRecord, User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'
import { DuplicateCallDetectionService } from '@/lib/services/duplicate-call-detection-service'
import { inngest } from '@/lib/inngest.config'

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

      // Parse invitees
      const invitees = transcript.participants?.map((email: string) => ({
        email,
        name: transcript.meeting_attendees?.find((attendee: any) => attendee.email === email)?.displayName || email,
        isExternal: email.split('@')[1] !== hostDomain
      })) || []

      // Resolve the actual sales rep from the webhook data
      // This handles the case where webhook comes from Head of Sales integration
      // but the call belongs to a specific sales rep
      const salesRepResolution = await DuplicateCallDetectionService.resolveSalesRep({
        db,
        organizationId: user.organizationId,
        salesRepEmail: transcript.host_email || transcript.organizer_email,
        fallbackUserId: user._id
      })

      const actualSalesRep = salesRepResolution.user || user
      console.log(`Sales rep resolved: ${actualSalesRep.firstName} ${actualSalesRep.lastName} (${actualSalesRep.email}) - resolved by: ${salesRepResolution.resolvedBy}`)

      // Check if call already exists using enhanced duplicate detection
      // Duplicate check is per-sales-rep: same call can exist for different reps
      const duplicateCheck = await DuplicateCallDetectionService.checkForDuplicate(db, {
        organizationId: user.organizationId,
        salesRepId: actualSalesRep._id?.toString() || '',
        scheduledStartTime: transcript.date ? new Date(transcript.date) : new Date(),
        salesRepEmail: transcript.host_email,
        salesRepName: `${actualSalesRep.firstName} ${actualSalesRep.lastName}`,
        leadEmails: invitees.map((i: any) => i.email).filter(Boolean),
        leadNames: invitees.map((i: any) => i.name).filter(Boolean),
        firefliesCallId: transcript.id
      })

      if (duplicateCheck.isDuplicate) {
        console.log(`Call already exists: ${transcript.id} (${duplicateCheck.matchType}: ${duplicateCheck.message})`)
        results.push({
          firefliesId: transcript.id,
          status: 'skipped',
          message: duplicateCheck.message,
          existingCallId: duplicateCheck.existingCallId
        })
        continue
      }

      console.log(`Processing new call for sales rep ${actualSalesRep._id?.toString()}: ${transcript.id}`)

      // Create CallRecord - assign to the resolved sales rep
      const callRecord: Omit<CallRecord, '_id'> = {
        organizationId: user.organizationId,
        userId: actualSalesRep._id!,
        salesRepId: actualSalesRep._id?.toString() || '',
        salesRepName: `${actualSalesRep.firstName} ${actualSalesRep.lastName}`,
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
        invitees,
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

      const result = await db.collection(COLLECTIONS.CALL_RECORDS).insertOne(callRecord)

      // Trigger Inngest function to process the call record asynchronously
      await inngest.send({
        name: 'call/process',
        data: {
          callRecordId: result.insertedId.toString(),
          source: 'fireflies' as const,
        },
      })

      console.log(`Successfully queued Fireflies call for processing: ${transcript.id}`)
      results.push({
        callRecordId: result.insertedId,
        firefliesId: transcript.id,
        status: 'success',
        message: 'Call record created and queued for processing'
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