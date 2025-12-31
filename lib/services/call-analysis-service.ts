import OpenAI from 'openai'
import connectToDatabase from '@/lib/mongodb'
import { CallAnalysis, CallRecord, AnalysisConfiguration, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'
import { DEFAULT_ANALYSIS_PROMPT as FRENCH_COACH_PROMPT } from '@/lib/constants/analysis-prompts'
import { CustomCriteriaService } from './custom-criteria-service'
import { DuplicateCallDetectionService } from './duplicate-call-detection-service'

let deepseek: OpenAI | null = null

function getDeepSeekClient(): OpenAI {
  if (!deepseek) {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY environment variable is required')
    }
    deepseek = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY,
      timeout: 300000, // 5 minutes timeout for deepseek-reasoner model
    })
  }
  return deepseek
}

/**
 * Transform analysis format to the expected UI schema
 * Handles both correct format (detailed with evaluationCompetences) and alternative formats (score_global, scores_par_critere)
 * This is a safety fallback for organizations with custom prompts that may return different formats
 */
function transformAnalysisToSchema(analysisData: any): Partial<CallAnalysis> {
  // Check if it's already in the expected format by verifying required fields
  if (
    analysisData.evaluationCompetences !== undefined &&
    Array.isArray(analysisData.evaluationCompetences) &&
    analysisData.noteGlobale !== undefined &&
    analysisData.resumeForces !== undefined &&
    analysisData.axesAmelioration !== undefined
  ) {
    // Already in the expected format, return as-is
    console.log('Analysis data already in correct format')
    return analysisData
  }

  // Check if it's an alternative format with score_global/scores_par_critere
  if (analysisData.score_global !== undefined || analysisData.scores_par_critere !== undefined) {
    console.log('⚠️  Detected alternative analysis format, transforming to standard schema...')
    console.log('Note: Consider updating your organization prompt to match the default format')

    // Transform alternative format to standard format
    const transformed: Partial<CallAnalysis> = {
      typeOfCall: analysisData.typeOfCall || 'other', // Default to 'other' if not specified
      closeur: analysisData.closeur || '',
      prospect: analysisData.prospect || '',
      dureeAppel: analysisData.dureeAppel || '',
      venteEffectuee: analysisData.venteEffectuee || false,
      temps_de_parole_closeur: analysisData.temps_de_parole_closeur || 0,
      temps_de_parole_client: analysisData.temps_de_parole_client || 0,
      resume_de_lappel: analysisData.resume_de_lappel || '',

      // Transform scores_par_critere to evaluationCompetences
      evaluationCompetences: analysisData.scores_par_critere
        ? Object.entries(analysisData.scores_par_critere).map(([key, score]) => ({
          etapeProcessus: key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          evaluation: score as number,
          temps_passe: 0,
          temps_passe_mm_ss: '00:00',
          timestamps: '00:00-00:00',
          commentaire: '',
          validation: (score as number) >= 5
        }))
        : [],

      // Transform score_global to noteGlobale
      noteGlobale: {
        total: analysisData.score_global || 0,
        sur100: String(analysisData.score_global || 0)
      },

      // Transform feedback_qualitatif.points_forts to resumeForces
      resumeForces: analysisData.feedback_qualitatif?.points_forts
        ? analysisData.feedback_qualitatif.points_forts.map((force: string) => ({
          pointFort: force
        }))
        : [],

      // Transform feedback_qualitatif.axes_d_amelioration to axesAmelioration
      axesAmelioration: analysisData.feedback_qualitatif?.axes_d_amelioration
        ? analysisData.feedback_qualitatif.axes_d_amelioration.map((axe: string) => ({
          axeAmelioration: axe,
          suggestion: '',
          exemple_issu_de_lappel: '',
          alternative: ''
        }))
        : [],

      // Transform to commentairesSupplementaires
      commentairesSupplementaires: {
        feedbackGeneral: analysisData.commentaire_managérial || '',
        prochainesEtapes: analysisData.feedback_qualitatif?.recommandations_immediates?.join(' ') || ''
      },

      // Transform to notesAdditionnelles
      notesAdditionnelles: {
        timestampsImportants: analysisData.timestampsImportants || [],
        ressourcesRecommandees: analysisData.feedback_qualitatif?.recommandations_immediates || []
      }
    }

    console.log('✓ Transformation complete')
    return transformed
  }

  // If neither format matches, return the data as-is and let it fail validation
  console.warn('⚠️  Unknown analysis format detected, returning data as-is')
  return analysisData
}


export class CallAnalysisService {
  /**
   * Get the active analysis configuration for the organization
   * Returns config with prompt and model
   */
  static async getOrganizationConfig(organizationId: ObjectId): Promise<{ prompt: string; model: string }> {
    try {
      const { db } = await connectToDatabase()

      // Get active configuration for the organization
      const config = await db.collection<AnalysisConfiguration>(COLLECTIONS.ANALYSIS_CONFIGURATIONS).findOne({
        organizationId,
        isActive: true
      })

      if (!config) {
        console.log(`No custom configuration found for organization: ${organizationId}, using defaults`)
        return {
          prompt: FRENCH_COACH_PROMPT,
          model: 'deepseek-reasoner'
        }
      }

      console.log(`Using custom configuration for organization: ${organizationId} - Model: ${config.model}`)
      return {
        prompt: config.prompt,
        model: config.model
      }
    } catch (error) {
      console.error('Error fetching organization configuration:', error)
      return {
        prompt: FRENCH_COACH_PROMPT,
        model: 'deepseek-reasoner'
      }
    }
  }

  /**
   * Get the analysis prompt for the organization
   * Returns custom prompt if set, otherwise returns default
   */
  static async getOrganizationPrompt(organizationId: ObjectId): Promise<string> {
    const config = await this.getOrganizationConfig(organizationId)
    return config.prompt
  }

  /**
   * Get the GPT model for the organization
   * Returns custom model if set, otherwise returns default (gpt-4o)
   */
  static async getOrganizationModel(organizationId: ObjectId): Promise<string> {
    const config = await this.getOrganizationConfig(organizationId)
    return config.model
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

      // Step 3: Check for duplicate analysis using composite key (scheduled date + client name + meeting title)
      // This prevents duplicate analyses when the same call arrives from multiple sources
      console.log(`[Step 3] Checking for existing analysis using composite key...`)
      const duplicateCheck = await DuplicateCallDetectionService.checkForDuplicateAnalysis(db, callRecord)

      if (duplicateCheck.isDuplicate) {
        if (force) {
          console.log(`[Step 3] Duplicate analysis found (${duplicateCheck.matchType}), but force=true, deleting existing...`)
          console.log(`[Step 3] ${duplicateCheck.message}`)

          // Delete existing analysis (could be for this call or another call with same composite key)
          if (duplicateCheck.existingAnalysisId) {
            await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS).deleteOne({
              _id: new ObjectId(duplicateCheck.existingAnalysisId)
            })
            console.log(`[Step 3] ✓ Existing analysis deleted, proceeding with re-analysis...`)
          }
        } else {
          console.log(`[Step 3] ✗ ${duplicateCheck.message}`)
          console.log(`[Step 3] Existing analysis ID: ${duplicateCheck.existingAnalysisId}`)
          console.log(`[Step 3] Match type: ${duplicateCheck.matchType}`)
          console.log(`=== CALL ANALYSIS SERVICE END (ALREADY EXISTS) ===`)
          return
        }
      } else {
        console.log(`[Step 3] ✓ ${duplicateCheck.message}`)
      }

      console.log(`[Step 4] Creating placeholder analysis record...`)
      const analysisRecord: Partial<CallAnalysis> = {
        organizationId: callRecord.organizationId || new ObjectId(),
        userId: callRecord.userId?.toString() || callRecord.salesRepId || '',
        callRecordId: new ObjectId(callRecordId),
        salesRepId: callRecord.salesRepId || '',
        typeOfCall: 'other', // Default value, will be updated by DeepSeek analysis
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
        console.log(`[Step 5] Preparing transcript for DeepSeek analysis...`)
        const transcriptForAnalysis = `Voici la transcription de l'appel de vente à analyser. 
        Réponds avec un objet json valide selon les instructions:

Titre: ${callRecord.title || 'Sans titre'}
Durée: ${Math.round(callRecord.actualDuration || 0)} minutes
Date: ${callRecord.scheduledStartTime?.toISOString() || new Date().toISOString()}

Transcription:
${callRecord.transcript}`

        console.log(`[Step 5] ✓ Transcript prepared (${callRecord.transcript.length} characters)`)

        console.log(`[Step 6] Fetching organization analysis prompt and model...`)
        const analysisPrompt = await this.getOrganizationPrompt(callRecord.organizationId || new ObjectId())
        console.log(`[Step 6] ✓ Analysis prompt fetched (${analysisPrompt.length} characters)`)

        console.log(`[Step 6.5] Fetching organization GPT model...`)
        const analysisModel = await this.getOrganizationModel(callRecord.organizationId || new ObjectId())
        console.log(`[Step 6.5] ✓ Using model: ${analysisModel}`)

        console.log(`[Step 7] Initializing DeepSeek client...`)
        try {
          const deepseekClient = getDeepSeekClient()
          console.log(`[Step 7] ✓ DeepSeek client initialized successfully`)

          console.log(`[Step 8] Sending request to DeepSeek API with model ${analysisModel}...`)
          const completion = await deepseekClient.chat.completions.create({
            model: analysisModel,
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
            temperature: 0.3,
            max_tokens: 8000,
            response_format: { type: "json_object" }
          })
          console.log(`[Step 8] ✓ DeepSeek API request completed successfully`)

          // Debug: log completion details
          const choice = completion.choices?.[0]
          const message = choice?.message as { content?: string | null; reasoning_content?: string | null }

          console.log(`[Step 8] Completion details:`, {
            id: completion.id,
            model: completion.model,
            choicesCount: completion.choices?.length,
            finishReason: choice?.finish_reason,
            hasContent: !!message?.content,
            contentLength: message?.content?.length || 0,
            hasReasoningContent: !!message?.reasoning_content,
            reasoningLength: message?.reasoning_content?.length || 0
          })

          // For deepseek-reasoner, content might be in reasoning_content
          let rawResponse = message?.content

          // If no content but has reasoning, log it for debugging
          if (!rawResponse && message?.reasoning_content) {
            console.log(`[Step 8] Model returned reasoning_content but no content. Reasoning length: ${message.reasoning_content.length}`)
            console.log(`[Step 8] Reasoning preview:`, message.reasoning_content.substring(0, 500))
          }

          if (!rawResponse) {
            console.error(`[Step 8] ✗ Empty response from DeepSeek.`)
            console.error(`[Step 8] Full completion:`, JSON.stringify(completion, null, 2).substring(0, 2000))
            throw new Error(`No response received from DeepSeek. Finish reason: ${choice?.finish_reason || 'unknown'}`)
          }

          console.log(`[Step 9] Processing DeepSeek response...`)
          console.log(`[Step 9] Response length: ${rawResponse.length} characters`)

          // Parse the JSON response
          let analysisData
          try {
            console.log(`[Step 9a] Parsing JSON response...`)

            // Helper function to clean and repair JSON
            const cleanAndRepairJson = (json: string): string => {
              let cleaned = json.trim()

              // Remove markdown code blocks if present
              cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')

              // Remove control characters except for valid JSON whitespace
              cleaned = cleaned.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')

              // Fix common escape issues - unescape already escaped quotes in already escaped strings
              // This handles cases like: "text with \"nested\" quotes"
              // We don't want to break valid escapes, but fix double escaping issues

              return cleaned
            }

            // Helper function to repair truncated JSON
            const repairTruncatedJson = (json: string): string => {
              let repaired = cleanAndRepairJson(json)

              // Count open brackets and braces
              let openBraces = 0
              let openBrackets = 0
              let inString = false
              let escapeNext = false

              for (let i = 0; i < repaired.length; i++) {
                const char = repaired[i]
                if (escapeNext) {
                  escapeNext = false
                  continue
                }
                if (char === '\\') {
                  escapeNext = true
                  continue
                }
                if (char === '"') {
                  inString = !inString
                  continue
                }
                if (!inString) {
                  if (char === '{') openBraces++
                  else if (char === '}') openBraces--
                  else if (char === '[') openBrackets++
                  else if (char === ']') openBrackets--
                }
              }

              // If we're inside an unfinished string, close it
              if (inString) {
                repaired += '"'
              }

              // Close any open brackets and braces
              while (openBrackets > 0) {
                repaired += ']'
                openBrackets--
              }
              while (openBraces > 0) {
                repaired += '}'
                openBraces--
              }

              return repaired
            }

            // Clean the response first
            let cleanedResponse = cleanAndRepairJson(rawResponse)

            // Try direct parse first
            try {
              analysisData = JSON.parse(cleanedResponse)
              console.log(`[Step 9a] ✓ Direct JSON parse successful`)
            } catch (directParseError) {
              // Fallback: extract JSON from response if wrapped in markdown or text
              console.log(`[Step 9a] Direct parse failed, attempting regex extraction...`)
              const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/)
              if (!jsonMatch) {
                throw new Error('No JSON found in DeepSeek response')
              }

              try {
                analysisData = JSON.parse(jsonMatch[0])
                console.log(`[Step 9a] ✓ Regex extraction successful`)
              } catch (regexParseError) {
                // Try to repair truncated JSON
                console.log(`[Step 9a] Regex parse failed, attempting JSON repair...`)
                const repairedJson = repairTruncatedJson(jsonMatch[0])
                try {
                  analysisData = JSON.parse(repairedJson)
                  console.log(`[Step 9a] ✓ JSON repair successful`)
                } catch (repairParseError) {
                  // Last resort: try to extract valid JSON object properties
                  console.log(`[Step 9a] JSON repair failed, attempting partial extraction...`)
                  console.log(`[Step 9a] Repaired JSON preview:`, repairedJson.substring(0, 500))
                  throw repairParseError
                }
              }
            }

            console.log(`[Step 9b] ✓ JSON parsed successfully`)
            console.log(`[Step 9b] Analysis data keys:`, Object.keys(analysisData))
          } catch (parseError) {
            console.error(`[Step 9] ✗ Error parsing DeepSeek JSON response:`, parseError)
            console.error(`[Step 9] Raw response preview:`, rawResponse.substring(0, 500) + '...')
            throw new Error('Failed to parse DeepSeek response as JSON')
          }

          console.log(`[Step 10] Updating analysis record in database...`)

          // Transform analysis data to match UI schema
          const transformedData = transformAnalysisToSchema(analysisData)

          // Update the analysis record with DeepSeek results
          const updateData: Partial<CallAnalysis> = {
            ...transformedData,
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

          // Step 12: Trigger custom criteria analysis if enabled for the user
          console.log(`[Step 12] Checking for custom criteria auto-run...`)
          try {
            await CustomCriteriaService.analyzeCustomCriteria(
              analysisId,
              callRecord.userId?.toString() || callRecord.salesRepId || ''
            )
            console.log(`[Step 12] ✓ Custom criteria analysis completed or skipped`)
          } catch (customCriteriaError) {
            // Don't fail the entire analysis if custom criteria fails
            console.error(`[Step 12] ⚠️  Custom criteria analysis failed:`, customCriteriaError)
            console.error(`[Step 12] Continuing despite custom criteria error`)
          }

        } catch (deepseekError) {
          console.error(`[Step 7-11] ✗ DeepSeek client or API error:`, deepseekError)
          throw deepseekError
        }

      } catch (apiError) {
        console.error(`=== DEEPSEEK ANALYSIS ERROR ===`)
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