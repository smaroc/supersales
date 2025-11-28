import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest.config'
import { processCall } from '@/lib/inngest/functions/process-call'

// Create the Inngest serve handler with all functions
const handler = serve({
    client: inngest,
    functions: [
        processCall,
    ],
    // Optional: Force streaming for longer execution times on Vercel
    // Requires Vercel Pro plan for 800s (13m20s) max duration
    // streaming: "force",
});

// Export all HTTP methods that Vercel/Inngest might need
export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE, handler as OPTIONS };
