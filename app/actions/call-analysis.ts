'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { CallAnalysis, CallEvaluation, User, COLLECTIONS } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { ObjectId } from 'mongodb'
import { CallAnalysisService } from '@/lib/services/call-analysis-service'
import { buildCallAnalysisFilter } from '@/lib/access-control'

export async function analyzeCallAction(callRecordId: string, force: boolean = false): Promise<void> {
  console.log(`=== CALL ANALYSIS SERVER ACTION START ===`)
  console.log(`Call Record ID: ${callRecordId}`)
  console.log(`Force re-analysis: ${force}`)

  try {
    await CallAnalysisService.analyzeCall(callRecordId, force)
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

    // Get current user to determine access level
    // Try to find by ObjectId first, then by clerkId
    let currentUser: User | null = null

    if (ObjectId.isValid(userId)) {
      currentUser = await db.collection<User>(COLLECTIONS.USERS)
        .findOne({ _id: new ObjectId(userId) })
    }

    // If not found by ObjectId, try clerkId
    if (!currentUser) {
      currentUser = await db.collection<User>(COLLECTIONS.USERS)
        .findOne({ clerkId: userId })
    }

    console.log('Current user:', currentUser)
    if (!currentUser) {
      console.error('User not found for ID:', userId)
      return []
    }

    // Build filter based on user access level (isAdmin, isSuperAdmin)
    const filter = buildCallAnalysisFilter(currentUser)

    console.log(`Access level filter applied: ${JSON.stringify(filter)}`)

    const callAnalyses = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray()

    console.log(`Call analyses fetched: ${callAnalyses.length} records`)
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

export async function getCallAnalysisById(callAnalysisId: string) {
  try {
    console.log('Fetching call analysis by ID:', callAnalysisId)

    if (!callAnalysisId || callAnalysisId.trim() === '') {
      throw new Error('Call analysis ID is required')
    }

    const { db } = await connectToDatabase()

    // Validate ObjectId format
    if (!ObjectId.isValid(callAnalysisId)) {
      throw new Error('Invalid call analysis ID format')
    }

    const callAnalysis = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
      .findOne({ _id: new ObjectId(callAnalysisId) })

    if (!callAnalysis) {
      throw new Error('Call analysis not found')
    }

    console.log('Call analysis fetched:', callAnalysis)
    // Convert MongoDB ObjectIds to strings for serialization
    return JSON.parse(JSON.stringify(callAnalysis))
  } catch (error) {
    console.error('Error fetching call analysis by ID:', error)
    throw error
  }
}

export async function toggleCallAnalysisShare(callAnalysisId: string) {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    if (!callAnalysisId || callAnalysisId.trim() === '') {
      throw new Error('Call analysis ID is required')
    }

    const { db } = await connectToDatabase()

    // Validate ObjectId format
    if (!ObjectId.isValid(callAnalysisId)) {
      throw new Error('Invalid call analysis ID format')
    }

    // Get current call analysis
    const callAnalysis = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
      .findOne({ _id: new ObjectId(callAnalysisId) })

    if (!callAnalysis) {
      throw new Error('Call analysis not found')
    }

    // Toggle share status
    const isCurrentlyPublic = callAnalysis.isPublic || false
    const updateData: Partial<CallAnalysis> = {
      isPublic: !isCurrentlyPublic,
      updatedAt: new Date()
    }

    if (!isCurrentlyPublic) {
      // Generate a unique share token
      const shareToken = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
      updateData.shareToken = shareToken
      updateData.sharedAt = new Date()
      updateData.sharedBy = userId
    } else {
      // Remove share token when making private
      updateData.shareToken = undefined
      updateData.sharedAt = undefined
      updateData.sharedBy = undefined
    }

    // Update the document
    await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
      .updateOne(
        { _id: new ObjectId(callAnalysisId) },
        { $set: updateData }
      )

    // Fetch updated document
    const updatedAnalysis = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
      .findOne({ _id: new ObjectId(callAnalysisId) })

    // Revalidate the page
    revalidatePath(`/dashboard/call-analysis/${callAnalysisId}`)

    return JSON.parse(JSON.stringify(updatedAnalysis))
  } catch (error) {
    console.error('Error toggling call analysis share:', error)
    throw error
  }
}

export async function getPublicCallAnalysis(shareToken: string) {
  try {
    console.log('Fetching public call analysis by share token:', shareToken)

    if (!shareToken || shareToken.trim() === '') {
      throw new Error('Share token is required')
    }

    const { db } = await connectToDatabase()

    const callAnalysis = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
      .findOne({
        shareToken: shareToken,
        isPublic: true
      })

    if (!callAnalysis) {
      throw new Error('Call analysis not found or not public')
    }

    console.log('Public call analysis fetched')
    // Convert MongoDB ObjectIds to strings for serialization
    return JSON.parse(JSON.stringify(callAnalysis))
  } catch (error) {
    console.error('Error fetching public call analysis:', error)
    throw error
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

    // Get current user to determine access level
    // Try to find by ObjectId first, then by clerkId
    let currentUser: User | null = null

    if (ObjectId.isValid(userId)) {
      currentUser = await db.collection<User>(COLLECTIONS.USERS)
        .findOne({ _id: new ObjectId(userId) })
    }

    // If not found by ObjectId, try clerkId
    if (!currentUser) {
      currentUser = await db.collection<User>(COLLECTIONS.USERS)
        .findOne({ clerkId: userId })
    }

    if (!currentUser) {
      console.error('User not found for ID:', userId)
      return []
    }

    // Build filter based on user access level
    const filter = buildCallAnalysisFilter(currentUser)

    console.log(`Access level filter applied for recent analyses: ${JSON.stringify(filter)}`)

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

export async function deleteCallAnalysis(callAnalysisId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Deleting call analysis:', callAnalysisId)

    const { userId } = await auth()
    if (!userId) {
      return { success: false, message: 'Unauthorized' }
    }

    if (!callAnalysisId || callAnalysisId.trim() === '') {
      return { success: false, message: 'Call analysis ID is required' }
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(callAnalysisId)) {
      return { success: false, message: 'Invalid call analysis ID format' }
    }

    const { db } = await connectToDatabase()

    // Get current user to check permissions
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return { success: false, message: 'User not found' }
    }

    // Get the call analysis to check ownership
    const callAnalysis = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
      .findOne({ _id: new ObjectId(callAnalysisId) })

    if (!callAnalysis) {
      return { success: false, message: 'Call analysis not found' }
    }

    // Check permissions: user must be the owner, an admin, or a super admin
    const isOwner = callAnalysis.userId === userId || callAnalysis.userId === currentUser._id?.toString()
    const hasOrgAccess = currentUser.isAdmin && callAnalysis.organizationId.toString() === currentUser.organizationId.toString()
    const hasSuperAdminAccess = currentUser.isSuperAdmin

    if (!isOwner && !hasOrgAccess && !hasSuperAdminAccess) {
      return { success: false, message: 'You do not have permission to delete this analysis' }
    }

    // Delete the call analysis
    const deleteResult = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS)
      .deleteOne({ _id: new ObjectId(callAnalysisId) })

    if (deleteResult.deletedCount === 0) {
      return { success: false, message: 'Failed to delete call analysis' }
    }

    // Update related call record status back to 'processing' if it exists
    if (callAnalysis.callRecordId) {
      await db.collection(COLLECTIONS.CALL_RECORDS)
        .updateOne(
          { _id: callAnalysis.callRecordId },
          {
            $set: {
              status: 'processing',
              updatedAt: new Date()
            }
          }
        )
    }

    console.log('Call analysis deleted successfully:', callAnalysisId)

    // Revalidate affected pages
    revalidatePath('/dashboard/call-analysis')
    revalidatePath('/dashboard')

    return { success: true, message: 'Call analysis deleted successfully' }
  } catch (error) {
    console.error('Error deleting call analysis:', error)
    return { success: false, message: 'Failed to delete call analysis' }
  }
}