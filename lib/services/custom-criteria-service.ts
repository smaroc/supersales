import OpenAI from 'openai'
import connectToDatabase from '@/lib/mongodb'
import { CallAnalysis, CallRecord, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

let deepseek: OpenAI | null = null

function getDeepSeekClient(): OpenAI {
  if (!deepseek) {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY environment variable is required')
    }
    deepseek = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY
    })
  }
  return deepseek
}

export class CustomCriteriaService {
  /**
   * Run custom criteria analysis for a call analysis
   * This is called automatically after standard analysis if user has autoRunCustomCriteria enabled
   */
  static async analyzeCustomCriteria(
    callAnalysisId: ObjectId | string,
    userId: string
  ): Promise<void> {
    console.log(`[Custom Criteria Service] Starting analysis for callAnalysisId: ${callAnalysisId}, userId: ${userId}`)

    if (!userId || userId.trim() === '') {
      console.log(`[Custom Criteria Service] No userId provided, skipping custom criteria analysis`)
      return
    }

    try {
      const { db } = await connectToDatabase()

      // Get the user to access their custom criteria
      const queryConditions: any[] = [{ clerkId: userId }]
      if (ObjectId.isValid(userId)) {
        queryConditions.push({ _id: new ObjectId(userId) })
      }

      const user = await db.collection('users').findOne({
        $or: queryConditions
      })

      if (!user) {
        console.log(`[Custom Criteria Service] User not found: ${userId}`)
        return
      }

      // Check if user has custom criteria and auto-run enabled
      const customCriteria = user.customAnalysisCriteria || []
      const autoRunEnabled = user.autoRunCustomCriteria || false

      if (!autoRunEnabled) {
        console.log(`[Custom Criteria Service] Auto-run disabled for user: ${userId}`)
        return
      }

      if (customCriteria.length === 0) {
        console.log(`[Custom Criteria Service] No custom criteria defined for user: ${userId}`)
        return
      }

      console.log(`[Custom Criteria Service] Found ${customCriteria.length} custom criteria, auto-run enabled`)

      // Get the call analysis
      const analysis = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS).findOne({
        _id: new ObjectId(callAnalysisId)
      })

      if (!analysis) {
        console.log(`[Custom Criteria Service] Call analysis not found: ${callAnalysisId}`)
        return
      }

      // Get the associated call record
      const callRecord = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).findOne({
        _id: analysis.callRecordId
      })

      if (!callRecord) {
        console.log(`[Custom Criteria Service] Call record not found: ${analysis.callRecordId}`)
        return
      }

      if (!callRecord.transcript || callRecord.transcript.trim() === '') {
        console.log(`[Custom Criteria Service] No transcript available for call: ${callRecord._id}`)
        return
      }

      console.log(`[Custom Criteria Service] Processing ${customCriteria.length} custom criteria`)

      // Process each custom criterion
      const customCriteriaResults = []
      const deepseekClient = getDeepSeekClient()

      for (const criterion of customCriteria) {
        console.log(`[Custom Criteria Service] Analyzing criterion: ${criterion.title}`)

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

          const completion = await deepseekClient.chat.completions.create({
            model: 'deepseek-reasoner',
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
            temperature: 0.3,
            max_tokens: 1500
          })

          const rawResponse = completion.choices[0]?.message?.content

          if (!rawResponse) {
            console.error(`[Custom Criteria Service] No response for criterion: ${criterion.title}`)
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

          console.log(`[Custom Criteria Service] ✓ Completed analysis for: ${criterion.title}`)
        } catch (error) {
          console.error(`[Custom Criteria Service] Error analyzing criterion ${criterion.title}:`, error)
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
        { _id: new ObjectId(callAnalysisId) },
        {
          $set: {
            customCriteriaResults,
            updatedAt: new Date()
          }
        }
      )

      console.log(`[Custom Criteria Service] ✓ Analysis completed successfully for ${customCriteriaResults.length} criteria`)

    } catch (error) {
      console.error('[Custom Criteria Service] Fatal error:', error)
      throw error
    }
  }
}
