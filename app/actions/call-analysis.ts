'use server'

import dbConnect from '@/lib/mongodb'
import CallAnalysis from '@/models/CallAnalysis'
import { revalidatePath } from 'next/cache'

export async function getCallAnalyses(organizationId: string) {
  try {
    // Return empty array if no organizationId is provided
    if (!organizationId || organizationId.trim() === '') {
      return []
    }

    await dbConnect()
    const callAnalyses = await CallAnalysis.find({ organizationId }).sort({ createdAt: -1 }).lean()

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
    await dbConnect()
    const callAnalysis = new CallAnalysis(data)
    const savedAnalysis = await callAnalysis.save()
    
    // Revalidate the pages that display this data
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/call-analysis')
    
    return JSON.parse(JSON.stringify(savedAnalysis))
  } catch (error) {
    console.error('Error creating call analysis:', error)
    throw new Error('Failed to create call analysis')
  }
}

export async function getRecentCallAnalyses(organizationId: string, limit: number = 3) {
  try {
    await dbConnect()
    const callAnalyses = await CallAnalysis.find({ organizationId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
    
    return JSON.parse(JSON.stringify(callAnalyses))
  } catch (error) {
    console.error('Error fetching recent call analyses:', error)
    throw new Error('Failed to fetch recent call analyses')
  }
}