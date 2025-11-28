import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest.config'
import { processCall } from '@/lib/inngest/functions/process-call'

// Create the Inngest serve handler with all functions
const handler = serve({
    client: inngest,
    functions: [processCall],
})

export { handler as GET, handler as POST, handler as PUT }
