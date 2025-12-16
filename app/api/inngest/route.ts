import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest.config'
import { processCall } from '@/lib/inngest/functions/process-call'
import { subscriptionReminder } from '@/lib/inngest/functions/subscription-reminder'

// Create the Inngest serve handler with all functions
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        processCall,
        subscriptionReminder,
    ],
    // Optional: Force streaming for longer execution times on Vercel
    // Requires Vercel Pro plan for 800s (13m20s) max duration
    // streaming: "force",
});
