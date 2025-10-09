'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { CallAnalysis, CallEvaluation, COLLECTIONS } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { ObjectId } from 'mongodb'
import { CallAnalysisService } from '@/lib/services/call-analysis-service'

export async function analyzeCallAction(callRecordId: string): Promise<void> {
  console.log(`=== CALL ANALYSIS SERVER ACTION START ===`)
  console.log(`Call Record ID: ${callRecordId}`)

  try {
    await CallAnalysisService.analyzeCall(callRecordId)
    console.log(`=== CALL ANALYSIS SERVER ACTION COMPLETED ===`)
  } catch (error) {
    console.error(`=== CALL ANALYSIS SERVER ACTION ERROR ===`)
    console.error(`Call Record ID: ${callRecordId}`)
    console.error(`Error:`, error)
    console.error(`=== CALL ANALYSIS SERVER ACTION END (ERROR) ===`)

    // Don't throw error to prevent webhook from failing
    // Analysis can be retried later if needed
  }
}

export async function getCallAnalyses(userId: string) {
  try {
    console.log('Fetching call analyses for user:', userId)
    // Return empty array if no userId is provided
    if (!userId || userId.trim() === '') {
      return []
    }

    const { db } = await connectToDatabase()

    // Get current user to check if admin
    const currentUser = await db.collection(COLLECTIONS.USERS)
    .findOne({ _id: new ObjectId(userId) })


    console.log('Current user:', currentUser)
    if (!currentUser) {
      return []
    }

    // Show all call analyses without filtering by user
    const filter = {}

    console.log(`filter applied : ${JSON.stringify(filter)}`)

    const callAnalyses = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray()

    console.log('Call analyses fetched:', callAnalyses)
    // Convert MongoDB ObjectIds to strings for serialization
    return JSON.parse(JSON.stringify(callAnalyses))
  } catch (error) {
    console.error('Error fetching call analyses:', error)
    return []
  }
}

export async function createCallAnalysis(data: {
  organizationId: string
  client: string
  representative: string
  duration: string
  date: Date
  sentiment: 'positive' | 'negative' | 'neutral'
  score: number
  topics: string[]
  outcome: string
  keyMoments: Array<{
    time: string
    type: 'objection' | 'positive' | 'decision' | 'question' | 'negative' | 'concern' | 'end'
    text: string
  }>
}) {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { db } = await connectToDatabase()

    // Convert to CallEvaluation format
    const callEvaluation: Omit<CallEvaluation, '_id'> = {
      organizationId: new ObjectId(data.organizationId),
      userId: userId,
      callId: `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      salesRepId: data.representative,
      evaluatorId: new ObjectId(), // This should be the current user's ID
      callTypeId: 'general',
      callType: 'GENERAL',
      evaluationDate: data.date,
      duration: parseInt(data.duration) || 30,
      outcome: data.outcome as CallEvaluation['outcome'],
      scores: {},
      totalScore: data.score,
      weightedScore: data.score,
      notes: data.topics.join(', '),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection<CallEvaluation>(COLLECTIONS.CALL_EVALUATIONS).insertOne(callEvaluation)
    const savedAnalysis = await db.collection<CallEvaluation>(COLLECTIONS.CALL_EVALUATIONS)
      .findOne({ _id: result.insertedId })

    // Revalidate the pages that display this data
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/call-analysis')

    return JSON.parse(JSON.stringify(savedAnalysis))
  } catch (error) {
    console.error('Error creating call analysis:', error)
    throw new Error('Failed to create call analysis')
  }
}

export async function getRecentCallAnalyses(userId: string | undefined, limit: number = 3) {
  try {
    const { db } = await connectToDatabase()

    if (!userId) {
      console.error('User ID is required')
      return []
    }

    console.log('Getting recent call analyses for user:', userId)

    // Show all call analyses without filtering by user
    const filter = {}

    // Get call evaluations with their corresponding call records
    const callEvaluations = await db.collection<CallEvaluation>(COLLECTIONS.CALL_EVALUATIONS)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()
      

    // Get corresponding call records for context
    const callIds = callEvaluations.map(evaluation => evaluation.callId)

    const callRecordFilter: Record<string, unknown> = {
      $or: [
        { _id: { $in: callIds.map(id => { try { return new ObjectId(id) } catch { return new ObjectId() } }).filter(id => id) } },
        { fathomCallId: { $in: callIds } },
        { firefliesCallId: { $in: callIds } }
      ]
    }

    const callRecords = await db.collection(COLLECTIONS.CALL_RECORDS)
      .find(callRecordFilter)
      .toArray()

    // Format data for dashboard display
    const formattedAnalyses = callEvaluations.map(evaluation => {
      const callRecord = callRecords.find(record =>
        record._id?.toString() === evaluation.callId ||
        record.fathomCallId === evaluation.callId ||
        record.firefliesCallId === evaluation.callId
      )

      // Determine sentiment based on score
      let sentiment = 'neutral'
      if (evaluation.weightedScore >= 75) sentiment = 'positive'
      else if (evaluation.weightedScore < 50) sentiment = 'negative'

      // Extract client name from call record or invitees
      let clientName = 'Unknown Client'
      if (callRecord?.invitees && callRecord.invitees.length > 0) {
        const externalInvitee = callRecord.invitees.find((inv: { isExternal: boolean; name: string }) => inv.isExternal)
        clientName = externalInvitee?.name || callRecord.invitees[0]?.name || 'Unknown Client'
      }

      return {
        _id: evaluation._id,
        callId: evaluation.callId,
        client: clientName,
        representative: evaluation.salesRepId,
        sentiment,
        score: Math.round(evaluation.weightedScore || evaluation.totalScore || 0),
        outcome: evaluation.outcome,
        date: evaluation.createdAt,
        duration: evaluation.duration || callRecord?.actualDuration || 0
      }
    })

    return JSON.parse(JSON.stringify(formattedAnalyses))
  } catch (error) {
    console.error('Error fetching recent call analyses:', error)
    throw new Error('Failed to fetch recent call analyses')
  }
}