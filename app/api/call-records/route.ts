import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { CallRecord, CallEvaluation, User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user data
    const { db } = await connectToDatabase()
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const source = url.searchParams.get('source')
    const status = url.searchParams.get('status')
    const salesRepId = url.searchParams.get('salesRepId')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Build query filters
    const filters: any = {
      organizationId: currentUser.organizationId
    }

    // Role-based filtering
    if (currentUser.role === 'sales_rep') {
      filters.salesRepId = currentUser._id?.toString()
    } else if (salesRepId) {
      filters.salesRepId = salesRepId
    }

    if (source) filters.source = source
    if (status) filters.status = status

    if (startDate || endDate) {
      filters.scheduledStartTime = {}
      if (startDate) filters.scheduledStartTime.$gte = new Date(startDate)
      if (endDate) filters.scheduledStartTime.$lte = new Date(endDate)
    }

    // Execute query with pagination
    const callRecords = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS)
      .find(filters)
      .sort({ scheduledStartTime: -1 })
      .limit(limit)
      .skip(offset)
      .toArray()

    // Get total count for pagination
    const totalCount = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).countDocuments(filters)

    // Get evaluations for the call records
    const callRecordsWithEvaluations = await Promise.all(
      callRecords.map(async (record) => {
        let evaluation = null
        if (record.evaluationId) {
          evaluation = await db.collection<CallEvaluation>(COLLECTIONS.CALL_EVALUATIONS)
            .findOne({ _id: new ObjectId(record.evaluationId) })
        }

        return {
          id: record._id,
          title: record.title,
          salesRepName: record.salesRepName,
          scheduledStartTime: record.scheduledStartTime,
          scheduledEndTime: record.scheduledEndTime,
          actualDuration: record.actualDuration,
          scheduledDuration: record.scheduledDuration,
          source: record.source,
          status: record.status,
          hasExternalInvitees: record.hasExternalInvitees,
          inviteesCount: record.invitees?.length || 0,
          recordingUrl: record.recordingUrl,
          shareUrl: record.shareUrl,
          evaluation: evaluation ? {
            totalScore: evaluation.totalScore,
            weightedScore: evaluation.weightedScore,
            outcome: evaluation.outcome
          } : null,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt
        }
      })
    )

    return NextResponse.json({
      callRecords: callRecordsWithEvaluations,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching call records:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}