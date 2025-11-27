import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest.config'
import { processCall } from '@/lib/inngest/functions/process-call'

// Create the Inngest serve handler with all functions
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        processCall,
    ],
})
