import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import OpenAI from 'openai'
import { CallAnalysis, CallRecord, COLLECTIONS } from '@/lib/types'

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  return openai
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { db } = await connectToDatabase()

    // Get the current user to access their custom criteria
    const user = await db.collection('users').findOne({ clerkId: userId })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has admin privileges
    if (!user.isAdmin && !user.isSuperAdmin) {
      return NextResponse.json({
        error: 'Forbidden: Only admins can post-process analyses'
      }, { status: 403 })
    }

    // Get custom criteria
    const customCriteria = user.customAnalysisCriteria || []

    if (customCriteria.length === 0) {
      return NextResponse.json({
        error: 'No custom criteria defined. Please add criteria in settings first.'
      }, { status: 400 })
    }

    // Get the call analysis
    const analysis = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS).findOne({
      _id: new ObjectId(id)
    })

    if (!analysis) {
      return NextResponse.json({ error: 'Call analysis not found' }, { status: 404 })
    }

    // Get the associated call record
    const callRecord = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).findOne({
      _id: analysis.callRecordId
    })

    if (!callRecord) {
      return NextResponse.json({ error: 'Call record not found' }, { status: 404 })
    }

    if (!callRecord.transcript || callRecord.transcript.trim() === '') {
      return NextResponse.json({
        error: 'No transcript available for this call'
      }, { status: 400 })
    }

    console.log(`[Custom Criteria Analysis] Starting post-processing for analysis ${id}`)
    console.log(`[Custom Criteria Analysis] Found ${customCriteria.length} custom criteria`)

    // Process each custom criterion
    const customCriteriaResults = []
    const openaiClient = getOpenAIClient()

    for (const criterion of customCriteria) {
      console.log(`[Custom Criteria Analysis] Analyzing criterion: ${criterion.title}`)

      try {
        const prompt = `You are analyzing a sales call transcript based on a specific criterion.

Criterion: ${criterion.title}
Instructions: ${criterion.description}

Please analyze the call transcript and provide:
1. A detailed analysis (2-3 paragraphs) based on the criterion instructions
2. A score from 0-10 (optional, only if applicable based on the criterion)
3. Key highlights or specific examples from the transcript (as an array of strings)

Respond with a JSON object in this format:
{
  "analysis": "Your detailed analysis here...",
  "score": 8,
  "highlights": ["Specific example 1", "Specific example 2"]
}

Note: If a score doesn't make sense for this criterion, omit it or set it to null.`

        const transcriptForAnalysis = `Call Title: ${callRecord.title || 'Untitled'}
Duration: ${Math.round(callRecord.actualDuration || 0)} minutes
Date: ${callRecord.scheduledStartTime?.toISOString() || new Date().toISOString()}

Transcript:
${callRecord.transcript}`

        const completion = await openaiClient.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: "system",
              content: prompt
            },
            {
              role: "user",
              content: transcriptForAnalysis
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 1500
        })

        const rawResponse = completion.choices[0]?.message?.content

        if (!rawResponse) {
          console.error(`[Custom Criteria Analysis] No response for criterion: ${criterion.title}`)
          continue
        }

        const result = JSON.parse(rawResponse)

        customCriteriaResults.push({
          criteriaId: criterion.id,
          criteriaTitle: criterion.title,
          analysis: result.analysis || '',
          score: result.score || null,
          highlights: result.highlights || [],
          analyzedAt: new Date()
        })

        console.log(`[Custom Criteria Analysis] ✓ Completed analysis for: ${criterion.title}`)
      } catch (error) {
        console.error(`[Custom Criteria Analysis] Error analyzing criterion ${criterion.title}:`, error)
        // Continue with other criteria even if one fails
        customCriteriaResults.push({
          criteriaId: criterion.id,
          criteriaTitle: criterion.title,
          analysis: 'Error analyzing this criterion. Please try again.',
          score: null,
          highlights: [],
          analyzedAt: new Date()
        })
      }
    }

    // Update the call analysis with custom criteria results
    await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS).updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          customCriteriaResults,
          updatedAt: new Date()
        }
      }
    )

    console.log(`[Custom Criteria Analysis] ✓ Post-processing completed successfully`)

    return NextResponse.json({
      success: true,
      message: 'Custom criteria analysis completed',
      results: customCriteriaResults
    })

  } catch (error) {
    console.error('Error in post-process analysis:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
