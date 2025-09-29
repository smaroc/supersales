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
    console.log('Fathom webhook data for user', userId, ':', JSON.stringify(data, null, 2))

    // Verify the user exists
    const { db } = await connectToDatabase()
    const user = await db.collection(COLLECTIONS.USERS).findOne({
      clerkId: userId
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Handle array format from Fathom
    const callsData = Array.isArray(data) ? data : [data]
    const results = []

    for (const callData of callsData) {
      // Create CallRecord
      const callRecord: Omit<CallRecord, '_id'> = {
        organizationId: user.organizationId,
        salesRepId: user.clerkId,
        salesRepName: `${user.firstName} ${user.lastName}`,
        source: 'fathom',
        fathomCallId: callData.id,
        title: callData.meeting_title || 'Fathom Meeting',
        scheduledStartTime: callData.meeting_scheduled_start_time ?
          new Date(callData.meeting_scheduled_start_time) : new Date(),
        scheduledEndTime: callData.meeting_scheduled_end_time ?
          new Date(callData.meeting_scheduled_end_time) : new Date(),
        actualDuration: parseFloat(callData.recording_duration_in_minutes) || 0,
        scheduledDuration: parseInt(callData.meeting_scheduled_duration_in_minute) || 0,
        transcript: callData.transcript_plaintext || '',
        recordingUrl: callData.recording_url || '',
        shareUrl: callData.recording_share_url || '',
        invitees: callData.meeting_invitees ? [{
          email: callData.meeting_invitees.split('\n').find((line: string) => line.includes('email:'))?.replace('email: ', '') || '',
          name: callData.meeting_invitees.split('\n').find((line: string) => line.includes('name:'))?.replace('name: ', '') || '',
          isExternal: callData.meeting_has_external_invitees === 'True'
        }] : [],
        hasExternalInvitees: callData.meeting_has_external_invitees === 'True',
        metadata: {
          fathomUserId: callData.fathom_user_emaill,
          fathomUserName: callData.fathom_user_name,
          fathomUserTeam: callData.fathom_user_team,
          scheduledDuration: callData.meeting_scheduled_duration_in_minute,
          shareUrl: callData.recording_share_url,
          hasExternalInvitees: callData.meeting_has_external_invitees === 'True'
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
        fathomId: callData.id
      })
    }

    console.log(`Fathom webhook processed for user ${userId}:`, results)

    return NextResponse.json({
      success: true,
      processed: results.length,
      callRecords: results
    })

  } catch (error) {
    console.error('Error processing Fathom webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}