'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { CallRecord, CallAnalysis, User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'
import { analyzeCallAction } from './call-analysis'
import { buildCallRecordsFilter } from '@/lib/access-control'

export interface CallRecordWithAnalysisStatus extends Omit<CallRecord, '_id' | 'organizationId' | 'userId'> {
  _id: string
  organizationId: string
  userId: string
  hasAnalysis: boolean
  analysisId?: string
  analysisStatus?: 'pending' | 'completed' | 'failed'
  analysisCreatedAt?: string
}

export async function getCallRecordsWithAnalysisStatus(): Promise<CallRecordWithAnalysisStatus[]> {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { db } = await connectToDatabase()

    // Get current user to determine access level
    const currentUser = await db.collection<User>(COLLECTIONS.USERS)
      .findOne({ clerkId: userId })

    if (!currentUser) {
      throw new Error('User not found')
    }

    // Build filter based on user access level
    const filter = buildCallRecordsFilter(currentUser)

    console.log(`Access level filter applied for call records: ${JSON.stringify(filter)}`)

    // Get call records with proper filtering
    const callRecords = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS)
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray()

    // Get call analyses with same filtering
    const analysisFilter = { ...filter }
    const callAnalyses = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
      .find(analysisFilter)
      .toArray()

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

    return JSON.parse(JSON.stringify(recordsWithStatus))
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

    // Trigger the analysis (with force parameter if needed)
    await analyzeCallAction(callRecordId, force)

    return {
      success: true,
      message: force ? 'Re-analysis started successfully' : 'Analysis started successfully'
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
