'use server'

import connectToDatabase from '@/lib/mongodb'
import { CallEvaluation, COLLECTIONS } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { ObjectId } from 'mongodb'

export async function getCallAnalyses(organizationId: string) {
  try {
    // Return empty array if no organizationId is provided
    if (!organizationId || organizationId.trim() === '') {
      return []
    }

    const { db } = await connectToDatabase()
    const callAnalyses = await db.collection<CallEvaluation>(COLLECTIONS.CALL_EVALUATIONS)
      .find({ organizationId: new ObjectId(organizationId) })
      .sort({ createdAt: -1 })
      .toArray()

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
    const { db } = await connectToDatabase()

    // Convert to CallEvaluation format
    const callEvaluation: Omit<CallEvaluation, '_id'> = {
      organizationId: new ObjectId(data.organizationId),
      callId: `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      salesRepId: data.representative,
      evaluatorId: new ObjectId(), // This should be the current user's ID
      callTypeId: 'general',
      callType: 'GENERAL',
      evaluationDate: data.date,
      duration: parseInt(data.duration) || 30,
      outcome: data.outcome as any,
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

export async function getRecentCallAnalyses(organizationId: string | any, limit: number = 3) {
  try {
    const { db } = await connectToDatabase()

    // Handle both string and object organizationId
    const orgId = typeof organizationId === 'string'
      ? new ObjectId(organizationId)
      : organizationId._id ? new ObjectId(organizationId._id) : new ObjectId(organizationId)

    const callAnalyses = await db.collection<CallEvaluation>(COLLECTIONS.CALL_EVALUATIONS)
      .find({ organizationId: orgId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    return JSON.parse(JSON.stringify(callAnalyses))
  } catch (error) {
    console.error('Error fetching recent call analyses:', error)
    throw new Error('Failed to fetch recent call analyses')
  }
}