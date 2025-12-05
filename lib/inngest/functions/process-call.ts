import { inngest } from '@/lib/inngest.config'
import { CallEvaluationService } from '@/lib/services/call-evaluation-service'
import { analyzeCallAction } from '@/app/actions/call-analysis'

// Event payload type for call processing
type ProcessCallEvent = {
    data: {
        callRecordId: string
        source: 'claap' | 'fathom' | 'fireflies' | 'zoom' | 'manual'
        force?: boolean
    }
}

// Inngest function to process call records
export const processCall = inngest.createFunction(
    {
        id: 'process-call',
        name: 'Process Call Record',
        retries: 3,
    },
    { event: 'call/process' },
    async ({ event, step }) => {
        const { callRecordId, source, force = false } = event.data as ProcessCallEvent['data']

        console.log(`[Inngest] Processing call ${callRecordId} from ${source}${force ? ' (force re-analysis)' : ''}`)

        // Step 1: Analyze call with OpenAI
        const analyzeSuccess = await step.run('analyze-call', async () => {
            console.log(`[Inngest] Starting OpenAI analysis for call ${callRecordId}${force ? ' (force)' : ''}`)
            try {
                await analyzeCallAction(callRecordId, force)
                console.log(`[Inngest] OpenAI analysis completed for call ${callRecordId}`)
                return true
            } catch (error) {
                console.error(`[Inngest] OpenAI analysis failed for call ${callRecordId}:`, error)
                throw error // Will trigger retry
            }
        })

        // Step 2: Process call evaluation
        const evaluateSuccess = await step.run('evaluate-call', async () => {
            console.log(`[Inngest] Starting call evaluation for call ${callRecordId}`)
            try {
                await CallEvaluationService.processCallRecord(callRecordId)
                console.log(`[Inngest] Call evaluation completed for call ${callRecordId}`)
                return true
            } catch (error) {
                console.error(`[Inngest] Call evaluation failed for call ${callRecordId}:`, error)
                throw error // Will trigger retry
            }
        })

        console.log(`[Inngest] Successfully processed call ${callRecordId}`)

        return {
            success: true,
            callRecordId,
            source,
            steps: {
                analyzeCall: analyzeSuccess,
                evaluateCall: evaluateSuccess,
            },
        }
    }
)
