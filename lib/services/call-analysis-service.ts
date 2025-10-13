import OpenAI from 'openai'
import connectToDatabase from '@/lib/mongodb'
import { CallAnalysis, CallRecord, Organization, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'
import { DEFAULT_ANALYSIS_PROMPT as FRENCH_COACH_PROMPT } from '@/lib/constants/analysis-prompts'

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


export class CallAnalysisService {
  /**
   * Get the analysis prompt for the organization
   * Returns custom prompt if set, otherwise returns default
   */
  static async getOrganizationPrompt(organizationId: ObjectId): Promise<string> {
    try {
      const { db } = await connectToDatabase()

      const organization = await db.collection<Organization>(COLLECTIONS.ORGANIZATIONS).findOne({
        _id: organizationId
      })

      if (!organization) {
        console.warn(`Organization not found: ${organizationId}, using default prompt`)
        return FRENCH_COACH_PROMPT
      }

      // Return custom prompt if set, otherwise default
      const customPrompt = organization.settings?.analysisPrompt
      if (customPrompt) {
        console.log(`Using custom analysis prompt for organization: ${organizationId}`)
        return customPrompt
      } else {
        console.log(`Using default analysis prompt for organization: ${organizationId}`)
        return FRENCH_COACH_PROMPT
      }
    } catch (error) {
      console.error('Error fetching organization prompt:', error)
      return FRENCH_COACH_PROMPT
    }
  }

  static async analyzeCall(callRecordId: string, force: boolean = false): Promise<void> {
    console.log(`=== CALL ANALYSIS SERVICE START ===`)
    console.log(`Call Record ID: ${callRecordId}`)
    console.log(`Force re-analysis: ${force}`)

    try {
      console.log(`[Step 1] Connecting to database...`)
      const { db } = await connectToDatabase()
      console.log(`[Step 1] ✓ Database connected successfully`)

      console.log(`[Step 2] Fetching call record from database...`)
      const callRecord = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).findOne({
        _id: new ObjectId(callRecordId)
      })

      if (!callRecord) {
        console.error(`[Step 2] ✗ Call record not found: ${callRecordId}`)
        console.error(`=== CALL ANALYSIS SERVICE END (RECORD NOT FOUND) ===`)
        return
      }
      console.log(`[Step 2] ✓ Call record found`)
      console.log(`[Step 2] Call details:`, {
        title: callRecord.title,
        source: callRecord.source,
        userId: callRecord.userId?.toString() || 'undefined',
        organizationId: callRecord.organizationId?.toString() || 'undefined',
        salesRepId: callRecord.salesRepId || 'undefined',
        transcriptLength: callRecord.transcript?.length || 0,
        hasTranscript: !!callRecord.transcript,
        isEmpty: !callRecord.transcript || callRecord.transcript.trim() === ''
      })

      if (!callRecord.transcript || callRecord.transcript.trim() === '') {
        console.warn(`[Step 2] ✗ No transcript available for call record: ${callRecordId}`)
        console.warn(`=== CALL ANALYSIS SERVICE END (NO TRANSCRIPT) ===`)
        return
      }
      console.log(`[Step 2] ✓ Transcript available (${callRecord.transcript.length} characters)`)

      console.log(`[Step 3] Checking for existing analysis...`)
      const existingAnalysis = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS).findOne({
        callRecordId: new ObjectId(callRecordId)
      })

      if (existingAnalysis) {
        if (force) {
          console.log(`[Step 3] Analysis already exists, but force=true, deleting existing analysis...`)
          await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS).deleteOne({
            _id: existingAnalysis._id
          })
          console.log(`[Step 3] ✓ Existing analysis deleted, proceeding with re-analysis...`)
        } else {
          console.log(`[Step 3] ✗ Analysis already exists for call record: ${callRecordId}`)
          console.log(`[Step 3] Existing analysis status:`, existingAnalysis.analysisStatus)
          console.log(`=== CALL ANALYSIS SERVICE END (ALREADY EXISTS) ===`)
          return
        }
      } else {
        console.log(`[Step 3] ✓ No existing analysis found, proceeding...`)
      }

      console.log(`[Step 4] Creating placeholder analysis record...`)
      const analysisRecord: Partial<CallAnalysis> = {
        organizationId: callRecord.organizationId || new ObjectId(),
        userId: callRecord.userId?.toString() || '',
        callRecordId: new ObjectId(callRecordId),
        salesRepId: callRecord.salesRepId || '',
        closeur: '',
        prospect: '',
        dureeAppel: '',
        venteEffectuee: false,
        temps_de_parole_closeur: 0,
        temps_de_parole_client: 0,
        resume_de_lappel: '',
        evaluationCompetences: [],
        noteGlobale: { total: 0, sur100: '0' },
        resumeForces: [],
        axesAmelioration: [],
        commentairesSupplementaires: { feedbackGeneral: '', prochainesEtapes: '' },
        notesAdditionnelles: { timestampsImportants: [], ressourcesRecommandees: [] },
        analysisStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS).insertOne(analysisRecord as CallAnalysis)
      const analysisId = result.insertedId
      console.log(`[Step 4] ✓ Placeholder analysis record created with ID: ${analysisId}`)

      try {
        console.log(`[Step 5] Preparing transcript for OpenAI analysis...`)
        const transcriptForAnalysis = `Voici la transcription de l'appel de vente à analyser:

Titre: ${callRecord.title || 'Sans titre'}
Durée: ${Math.round(callRecord.actualDuration || 0)} minutes
Date: ${callRecord.scheduledStartTime?.toISOString() || new Date().toISOString()}

Transcription:
${callRecord.transcript}`

        console.log(`[Step 5] ✓ Transcript prepared (${callRecord.transcript.length} characters)`)

        console.log(`[Step 6] Fetching organization analysis prompt...`)
        const analysisPrompt = await this.getOrganizationPrompt(callRecord.organizationId || new ObjectId())
        console.log(`[Step 6] ✓ Analysis prompt fetched (${analysisPrompt.length} characters)`)

        console.log(`[Step 7] Initializing OpenAI client...`)
        try {
          const openaiClient = getOpenAIClient()
          console.log(`[Step 7] ✓ OpenAI client initialized successfully`)

          console.log(`[Step 8] Sending request to OpenAI API...`)
          const completion = await openaiClient.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: analysisPrompt
              },
              {
                role: "user",
                content: transcriptForAnalysis
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 4000
          })
          console.log(`[Step 8] ✓ OpenAI API request completed successfully`)

          const rawResponse = completion.choices[0]?.message?.content

          if (!rawResponse) {
            throw new Error('No response received from OpenAI')
          }

          console.log(`[Step 9] Processing OpenAI response...`)
          console.log(`[Step 9] Response length: ${rawResponse.length} characters`)

          // Parse the JSON response
          let analysisData
          try {
            console.log(`[Step 9a] Parsing JSON response...`)
            // With response_format json_object, the response should be pure JSON
            // Try direct parse first
            try {
              analysisData = JSON.parse(rawResponse)
              console.log(`[Step 9a] ✓ Direct JSON parse successful`)
            } catch (directParseError) {
              // Fallback: extract JSON from response if wrapped in markdown or text
              console.log(`[Step 9a] Direct parse failed, attempting regex extraction...`)
              const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
              if (!jsonMatch) {
                throw new Error('No JSON found in OpenAI response')
              }
              analysisData = JSON.parse(jsonMatch[0])
              console.log(`[Step 9a] ✓ Regex extraction successful`)
            }

            console.log(`[Step 9b] ✓ JSON parsed successfully`)
            console.log(`[Step 9b] Analysis data keys:`, Object.keys(analysisData))
          } catch (parseError) {
            console.error(`[Step 9] ✗ Error parsing OpenAI JSON response:`, parseError)
            console.error(`[Step 9] Raw response preview:`, rawResponse.substring(0, 500) + '...')
            throw new Error('Failed to parse OpenAI response as JSON')
          }

          console.log(`[Step 10] Updating analysis record in database...`)
          // Update the analysis record with OpenAI results
          const updateData: Partial<CallAnalysis> = {
            ...analysisData,
            rawAnalysisResponse: rawResponse,
            analysisStatus: 'completed',
            updatedAt: new Date()
          }

          await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS).updateOne(
            { _id: analysisId },
            { $set: updateData }
          )
          console.log(`[Step 10] ✓ Analysis record updated successfully`)

          console.log(`[Step 11] Updating call record status...`)
          // Update call record status
          await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).updateOne(
            { _id: new ObjectId(callRecordId) },
            {
              $set: {
                status: 'evaluated',
                updatedAt: new Date()
              }
            }
          )
          console.log(`[Step 11] ✓ Call record status updated`)

          console.log(`=== CALL ANALYSIS SERVICE COMPLETED SUCCESSFULLY ===`)

        } catch (openaiError) {
          console.error(`[Step 7-11] ✗ OpenAI client or API error:`, openaiError)
          throw openaiError
        }

      } catch (apiError) {
        console.error(`=== OPENAI ANALYSIS ERROR ===`)
        console.error(`Error Type: ${apiError instanceof Error ? apiError.constructor.name : 'Unknown'}`)
        console.error(`Error Message: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`)
        console.error(`Full Error:`, apiError)

        // Update analysis record with error
        console.log(`[Error Recovery] Updating analysis record with error status...`)
        await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS).updateOne(
          { _id: analysisId },
          {
            $set: {
              analysisStatus: 'failed',
              analysisError: apiError instanceof Error ? apiError.message : 'Unknown error',
              updatedAt: new Date()
            }
          }
        )
        console.log(`[Error Recovery] ✓ Analysis record updated with error status`)

        throw apiError
      }

    } catch (error) {
      console.error(`=== CALL ANALYSIS SERVICE FATAL ERROR ===`)
      console.error(`Call Record ID: ${callRecordId}`)
      console.error(`Error Type: ${error instanceof Error ? error.constructor.name : 'Unknown'}`)
      console.error(`Error Message: ${error instanceof Error ? error.message : 'Unknown error'}`)
      console.error(`Full Error:`, error)
      console.error(`=== CALL ANALYSIS SERVICE END (FATAL ERROR) ===`)
    }
  }
}