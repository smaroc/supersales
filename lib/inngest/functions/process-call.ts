import { inngest } from '@/lib/inngest.config'
import { CallEvaluationService } from '@/lib/services/call-evaluation-service'
import { analyzeCallAction } from '@/app/actions/call-analysis'
import { Resend } from 'resend'
import connectToDatabase from '@/lib/mongodb'
import { CallRecord, User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

const getResend = () => new Resend(process.env.RESEND_API_KEY)

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

        // Step 0: Verify user has paid access and get user/call info
        const accessCheck = await step.run('verify-access', async () => {
            const { db } = await connectToDatabase()

            // Get the call record to find the user
            const callRecord = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).findOne({
                _id: new ObjectId(callRecordId)
            })

            if (!callRecord) {
                console.error(`[Inngest] Call record not found: ${callRecordId}`)
                return { hasAccess: false, user: null, callTitle: null }
            }

            // Get the user and check hasAccess
            const user = await db.collection<User>(COLLECTIONS.USERS).findOne({
                _id: new ObjectId(callRecord.salesRepId)
            })

            if (!user) {
                console.error(`[Inngest] User not found for call ${callRecordId}`)
                return { hasAccess: false, user: null, callTitle: callRecord.title }
            }

            if (!user.hasAccess) {
                console.warn(`[Inngest] User ${user.email} does not have paid access - skipping analysis for call ${callRecordId}`)
                return {
                    hasAccess: false,
                    user: { email: user.email, firstName: user.firstName },
                    callTitle: callRecord.title
                }
            }

            console.log(`[Inngest] User ${user.email} has valid access - proceeding with analysis`)
            return { hasAccess: true, user: null, callTitle: null }
        })

        // If user doesn't have access, send notification email and skip processing
        if (!accessCheck.hasAccess) {
            // Send email notification about missed analysis
            if (accessCheck.user?.email) {
                await step.run('send-no-access-notification', async () => {
                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://supersales.dev'
                    const checkoutUrl = `${baseUrl}/checkout`

                    await getResend().emails.send({
                        from: 'SuperSales <noreply@mail.supersales.dev>',
                        to: accessCheck.user!.email,
                        subject: `⚠️ Appel non analysé : ${accessCheck.callTitle || 'Nouvel appel'}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #1a1a1a;">Votre appel n'a pas pu être analysé</h2>
                                <p style="color: #4a4a4a;">Bonjour ${accessCheck.user!.firstName},</p>
                                <p style="color: #4a4a4a;">Nous avons reçu un nouvel appel : <strong>"${accessCheck.callTitle || 'Sans titre'}"</strong></p>
                                <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
                                    <p style="color: #92400e; margin: 0;">
                                        <strong>⚠️ Cet appel n'a pas été analysé</strong> car votre abonnement n'est pas actif.
                                    </p>
                                </div>
                                <p style="color: #4a4a4a;">Pour bénéficier de l'analyse IA de vos appels et améliorer vos performances commerciales, activez votre abonnement :</p>
                                <div style="margin: 24px 0;">
                                    <a href="${checkoutUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                        Activer mon abonnement
                                    </a>
                                </div>
                                <p style="color: #6a6a6a; font-size: 14px;">Une fois abonné, vous pourrez relancer l'analyse de cet appel depuis votre tableau de bord.</p>
                                <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
                                <p style="color: #9a9a9a; font-size: 12px;">SuperSales - Votre assistant commercial IA</p>
                            </div>
                        `,
                    })

                    console.log(`[Inngest] No-access notification email sent to ${accessCheck.user!.email}`)
                })
            }

            return {
                success: false,
                callRecordId,
                source,
                reason: 'User does not have paid access',
                steps: {
                    verifyAccess: false,
                    notifyNoAccess: !!accessCheck.user?.email,
                    analyzeCall: false,
                    evaluateCall: false,
                    sendEmail: false,
                },
            }
        }

        // Step 1: Analyze call with DeepSeek
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

        // Step 3: Send email notification to the user
        const emailSent = await step.run('send-notification-email', async () => {
            console.log(`[Inngest] Sending notification email for call ${callRecordId}`)
            try {
                const { db } = await connectToDatabase()

                // Get the call record to find the user
                const callRecord = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).findOne({
                    _id: new ObjectId(callRecordId)
                })

                if (!callRecord) {
                    console.warn(`[Inngest] Call record not found: ${callRecordId}`)
                    return false
                }

                // Get the user's email
                const user = await db.collection<User>(COLLECTIONS.USERS).findOne({
                    _id: new ObjectId(callRecord.salesRepId)
                })

                if (!user || !user.email) {
                    console.warn(`[Inngest] User not found for call ${callRecordId}`)
                    return false
                }

                // Build the call analysis URL
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://supersales.dev'
                const callAnalysisUrl = `${baseUrl}/dashboard/call-analysis/${callRecordId}`

                // Send email notification
                await getResend().emails.send({
                    from: 'SuperSales <noreply@mail.supersales.dev>',
                    to: user.email,
                    subject: `🎯 Analyse prête : ${callRecord.title || 'Nouvel appel'}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #1a1a1a;">Votre analyse d'appel est prête !</h2>
                            <p style="color: #4a4a4a;">Bonjour ${user.firstName},</p>
                            <p style="color: #4a4a4a;">L'analyse de votre appel <strong>"${callRecord.title || 'Sans titre'}"</strong> est maintenant disponible.</p>
                            <div style="margin: 24px 0;">
                                <a href="${callAnalysisUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                    Voir l'analyse
                                </a>
                            </div>
                            <p style="color: #6a6a6a; font-size: 14px;">Source: ${source}</p>
                            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
                            <p style="color: #9a9a9a; font-size: 12px;">SuperSales - Votre assistant commercial IA</p>
                        </div>
                    `,
                })

                console.log(`[Inngest] Notification email sent to ${user.email} for call ${callRecordId}`)
                return true
            } catch (error) {
                console.error(`[Inngest] Failed to send notification email for call ${callRecordId}:`, error)
                // Don't throw - email is not critical, don't retry the whole process
                return false
            }
        })

        console.log(`[Inngest] Successfully processed call ${callRecordId}`)

        return {
            success: true,
            callRecordId,
            source,
            steps: {
                verifyAccess: accessCheck.hasAccess,
                analyzeCall: analyzeSuccess,
                evaluateCall: evaluateSuccess,
                sendEmail: emailSent,
            },
        }
    }
)
