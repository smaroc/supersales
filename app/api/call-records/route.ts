import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import CallRecord from '@/models/CallRecord'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const source = url.searchParams.get('source')
    const status = url.searchParams.get('status')
    const salesRepId = url.searchParams.get('salesRepId')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    await dbConnect()

    // Build query filters
    const filters: any = {
      organizationId: session.user.organizationId
    }

    // Role-based filtering
    if (session.user.role === 'sales_rep') {
      filters.salesRepId = session.user.id
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
    const callRecords = await CallRecord.find(filters)
      .sort({ scheduledStartTime: -1 })
      .limit(limit)
      .skip(offset)
      .populate('evaluationId', 'totalScore weightedScore outcome')
      .lean()

    // Get total count for pagination
    const totalCount = await CallRecord.countDocuments(filters)

    // Format response
    const formattedRecords = callRecords.map(record => ({
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
      evaluation: record.evaluationId ? {
        totalScore: (record.evaluationId as any).totalScore,
        weightedScore: (record.evaluationId as any).weightedScore,
        outcome: (record.evaluationId as any).outcome
      } : null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    }))

    return NextResponse.json({
      callRecords: formattedRecords,
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