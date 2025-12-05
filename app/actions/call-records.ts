'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { CallRecord, CallAnalysis, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'
import { inngest } from '@/lib/inngest.config'
import { buildCallRecordsFilter } from '@/lib/access-control'
import { getAuthorizedUser } from './users'

export interface CallRecordWithAnalysisStatus extends Omit<CallRecord, '_id' | 'organizationId' | 'userId'> {
  _id: string
  organizationId: string
  userId: string
  hasAnalysis: boolean
  analysisId?: string
  analysisStatus?: 'pending' | 'completed' | 'failed'
  analysisCreatedAt?: string
}

export interface PaginatedCallRecords {
  records: CallRecordWithAnalysisStatus[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

export async function getCallRecordsWithAnalysisStatus(
  page: number = 1,
  limit: number = 200
): Promise<PaginatedCallRecords> {
  try {
    const { db, currentUser } = await getAuthorizedUser()

    // Build filter based on user access level (respects impersonation)
    const filter = buildCallRecordsFilter(currentUser)

    console.log(`Call Records - User: ${currentUser.email}, isAdmin: ${currentUser.isAdmin}, isSuperAdmin: ${currentUser.isSuperAdmin}`)
    console.log(`Call Records - Filter applied: ${JSON.stringify(filter)}`)

    // Validate pagination parameters
    const pageNumber = Math.max(1, page)
    const pageSize = Math.min(Math.max(1, limit), 200) // Max 200 per page
    const skip = (pageNumber - 1) * pageSize

    // Get total count for pagination metadata
    const totalCount = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS)
      .countDocuments(filter)

    // Use find() instead of aggregate() for better performance and index usage
    // Let MongoDB automatically choose the best index based on the query
    const callRecords = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS)
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .project({
        _id: 1,
        organizationId: 1,
        userId: 1,
        salesRepId: 1,
        salesRepName: 1,
        title: 1,
        scheduledStartTime: 1,
        scheduledEndTime: 1,
        actualDuration: 1,
        scheduledDuration: 1,
        transcript: 1,
        recordingUrl: 1,
        shareUrl: 1,
        invitees: 1,
        hasExternalInvitees: 1,
        metadata: 1,
        status: 1,
        evaluationId: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .toArray() as CallRecord[]

    console.log(`Call Records - Found ${callRecords.length} records (page ${pageNumber}, limit ${pageSize}, total ${totalCount})`)
    if (callRecords.length > 0 && !currentUser.isAdmin && !currentUser.isSuperAdmin) {
      console.log(`Call Records - Sample salesRepId from data: ${callRecords[0]?.salesRepId}`)
      console.log(`Call Records - User _id: ${currentUser._id?.toString()}, clerkId: ${currentUser.clerkId}`)
    }

    // Get call analyses only for the records in this page (more efficient)
    const recordIds = callRecords
      .map(r => r._id)
      .filter((id): id is ObjectId => id !== undefined)
    const callAnalyses = recordIds.length > 0
      ? await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
          .find({ callRecordId: { $in: recordIds } })
          .toArray()
      : []

    // Create a map of call record IDs to their analyses
    const analysisMap = new Map<string, CallAnalysis>()
    for (const analysis of callAnalyses) {
      if (analysis.callRecordId) {
        analysisMap.set(analysis.callRecordId.toString(), analysis)
      }
    }

    // Combine the data
    const recordsWithStatus: CallRecordWithAnalysisStatus[] = callRecords.map(record => {
      const recordId = record._id?.toString() || ''
      const analysis = analysisMap.get(recordId)

      return {
        _id: recordId,
        organizationId: record.organizationId?.toString() || '',
        userId: record.userId?.toString() || '',
        salesRepId: record.salesRepId,
        salesRepName: record.salesRepName,
        source: record.source,
        fathomCallId: record.fathomCallId,
        firefliesCallId: record.firefliesCallId,
        zoomCallId: record.zoomCallId,
        title: record.title,
        scheduledStartTime: record.scheduledStartTime,
        scheduledEndTime: record.scheduledEndTime,
        actualDuration: record.actualDuration,
        scheduledDuration: record.scheduledDuration,
        transcript: record.transcript,
        recordingUrl: record.recordingUrl,
        shareUrl: record.shareUrl,
        invitees: record.invitees,
        hasExternalInvitees: record.hasExternalInvitees,
        metadata: record.metadata,
        status: record.status,
        evaluationId: record.evaluationId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        hasAnalysis: !!analysis,
        analysisId: analysis?._id?.toString(),
        analysisStatus: analysis?.analysisStatus,
        analysisCreatedAt: analysis?.createdAt?.toString(),
      }
    })

    const totalPages = Math.ceil(totalCount / pageSize)
    const hasMore = pageNumber < totalPages

    return JSON.parse(JSON.stringify({
      records: recordsWithStatus,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total: totalCount,
        totalPages,
        hasMore,
      }
    }))
  } catch (error) {
    console.error('Error fetching call records with analysis status:', error)
    throw error
  }
}

export async function triggerManualAnalysis(callRecordId: string, force: boolean = false) {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    console.log(`Manually triggering analysis for call record: ${callRecordId}`)
    console.log(`Force re-analysis: ${force}`)

    const { db } = await connectToDatabase()

    // Validate that the call record exists
    if (!ObjectId.isValid(callRecordId)) {
      throw new Error('Invalid call record ID')
    }

    const callRecord = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS)
      .findOne({ _id: new ObjectId(callRecordId) })

    if (!callRecord) {
      throw new Error('Call record not found')
    }

    // Check if analysis already exists
    const existingAnalysis = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
      .findOne({ callRecordId: new ObjectId(callRecordId) })

    if (existingAnalysis && !force) {
      console.log('Analysis already exists for this call record')
      return {
        success: true,
        message: 'Analysis already exists',
        analysisId: existingAnalysis._id?.toString()
      }
    }

    // Trigger the analysis via Inngest (with force parameter if needed)
    await inngest.send({
      name: 'call/process',
      data: {
        callRecordId,
        source: 'manual' as const,
        force,
      },
    })

    console.log(`Inngest event sent for call record: ${callRecordId}`)

    return {
      success: true,
      message: force ? 'Re-analysis queued successfully' : 'Analysis queued successfully'
    }
  } catch (error) {
    console.error('Error triggering manual analysis:', error)
    throw error
  }
}

export async function getCallRecordById(callRecordId: string) {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    if (!callRecordId || callRecordId.trim() === '') {
      throw new Error('Call record ID is required')
    }

    const { db } = await connectToDatabase()

    if (!ObjectId.isValid(callRecordId)) {
      throw new Error('Invalid call record ID format')
    }

    const callRecord = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS)
      .findOne({ _id: new ObjectId(callRecordId) })

    if (!callRecord) {
      throw new Error('Call record not found')
    }

    return JSON.parse(JSON.stringify(callRecord))
  } catch (error) {
    console.error('Error fetching call record by ID:', error)
    throw error
  }
}

export async function deleteCallRecords(callRecordIds: string[]): Promise<{ success: boolean; message: string; deletedCount: number }> {
  try {
    const { db, currentUser } = await getAuthorizedUser()

    if (!callRecordIds || callRecordIds.length === 0) {
      return { success: false, message: 'No call record IDs provided', deletedCount: 0 }
    }

    // Validate all ObjectIds
    const validIds = callRecordIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id))

    if (validIds.length === 0) {
      return { success: false, message: 'No valid call record IDs provided', deletedCount: 0 }
    }

    // Build filter based on user access level
    const filter = buildCallRecordsFilter(currentUser)
    
    // Add ID filter and ensure user has access to these records
    const deleteFilter = {
      ...filter,
      _id: { $in: validIds }
    }

    // Delete call records
    const deleteResult = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS)
      .deleteMany(deleteFilter)

    // Also delete associated analyses
    if (deleteResult.deletedCount > 0) {
      await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
        .deleteMany({ callRecordId: { $in: validIds } })
    }

    console.log(`Deleted ${deleteResult.deletedCount} call record(s)`)

    return {
      success: true,
      message: `${deleteResult.deletedCount} enregistrement(s) supprimé(s) avec succès`,
      deletedCount: deleteResult.deletedCount
    }
  } catch (error) {
    console.error('Error deleting call records:', error)
    return { success: false, message: 'Erreur lors de la suppression', deletedCount: 0 }
  }
}
