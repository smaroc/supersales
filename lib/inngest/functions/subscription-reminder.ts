import { inngest } from '@/lib/inngest.config'
import { Resend } from 'resend'
import connectToDatabase from '@/lib/mongodb'
import { User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

const resend = new Resend(process.env.RESEND_API_KEY)

// Event payload type for subscription reminders
type SubscriptionReminderEvent = {
    data: {
        userId: string
        userEmail: string
        userName: string
    }
}

// Inngest function to send subscription reminder emails
export const subscriptionReminder = inngest.createFunction(
    {
        id: 'subscription-reminder',
        name: 'Subscription Reminder Emails',
    },
    { event: 'user/invited' },
    async ({ event, step }) => {
        const { userId, userEmail, userName } = event.data as SubscriptionReminderEvent['data']

        console.log(`[Inngest] Starting subscription reminder flow for user ${userEmail}`)

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://supersales.dev'
        const checkoutUrl = `${baseUrl}/checkout`

        // Step 1: Wait 3 days before first reminder
        await step.sleep('wait-3-days', '3d')

        // Step 2: Check if user has paid
        const hasPaidAfter3Days = await step.run('check-payment-day-3', async () => {
            const { db } = await connectToDatabase()
            const user = await db.collection<User>(COLLECTIONS.USERS).findOne({
                _id: new ObjectId(userId)
            })

            if (!user) {
                console.log(`[Inngest] User ${userId} not found`)
                return true // Stop the flow if user doesn't exist
            }

            if (user.hasAccess) {
                console.log(`[Inngest] User ${userEmail} already has access - stopping reminders`)
                return true
            }

            return false
        })

        if (hasPaidAfter3Days) {
            return {
                success: true,
                userId,
                reason: 'User already has access or not found',
                emailsSent: 0,
            }
        }

        // Step 3: Send first reminder email (day 3)
        await step.run('send-first-reminder', async () => {
            console.log(`[Inngest] Sending first reminder email to ${userEmail}`)

            await resend.emails.send({
                from: 'SuperSales <noreply@mail.supersales.dev>',
                to: userEmail,
                subject: '🚀 Activez votre compte SuperSales',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a1a1a;">Bonjour ${userName} !</h2>
                        <p style="color: #4a4a4a;">Vous avez été invité(e) à rejoindre SuperSales, mais nous avons remarqué que vous n'avez pas encore activé votre abonnement.</p>
                        <p style="color: #4a4a4a;">Avec SuperSales, vous pouvez :</p>
                        <ul style="color: #4a4a4a;">
                            <li>📊 Analyser automatiquement vos appels commerciaux</li>
                            <li>🎯 Obtenir des conseils personnalisés pour améliorer vos performances</li>
                            <li>📈 Suivre votre progression et celle de votre équipe</li>
                        </ul>
                        <div style="margin: 24px 0;">
                            <a href="${checkoutUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Activer mon compte
                            </a>
                        </div>
                        <p style="color: #6a6a6a; font-size: 14px;">Si vous avez des questions, n'hésitez pas à nous contacter.</p>
                        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
                        <p style="color: #9a9a9a; font-size: 12px;">SuperSales - Votre assistant commercial IA</p>
                    </div>
                `,
            })

            console.log(`[Inngest] First reminder email sent to ${userEmail}`)
            return true
        })

        // Step 4: Wait another 4 days (7 days total)
        await step.sleep('wait-4-more-days', '4d')

        // Step 5: Check if user has paid
        const hasPaidAfter7Days = await step.run('check-payment-day-7', async () => {
            const { db } = await connectToDatabase()
            const user = await db.collection<User>(COLLECTIONS.USERS).findOne({
                _id: new ObjectId(userId)
            })

            if (!user) {
                console.log(`[Inngest] User ${userId} not found`)
                return true
            }

            if (user.hasAccess) {
                console.log(`[Inngest] User ${userEmail} has subscribed - stopping reminders`)
                return true
            }

            return false
        })

        if (hasPaidAfter7Days) {
            return {
                success: true,
                userId,
                reason: 'User subscribed after first reminder',
                emailsSent: 1,
            }
        }

        // Step 6: Send final reminder email (day 7)
        await step.run('send-final-reminder', async () => {
            console.log(`[Inngest] Sending final reminder email to ${userEmail}`)

            await resend.emails.send({
                from: 'SuperSales <noreply@mail.supersales.dev>',
                to: userEmail,
                subject: '⏰ Dernière chance - Activez SuperSales',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a1a1a;">Bonjour ${userName},</h2>
                        <p style="color: #4a4a4a;">C'est notre dernier rappel ! Votre invitation à rejoindre SuperSales expire bientôt.</p>
                        <p style="color: #4a4a4a;">Ne manquez pas l'opportunité d'améliorer vos performances commerciales avec notre IA de coaching.</p>
                        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                            <p style="color: #1a1a1a; margin: 0; font-weight: bold;">✨ Ce que vous obtenez :</p>
                            <ul style="color: #4a4a4a; margin-top: 8px;">
                                <li>Analyse détaillée de chaque appel</li>
                                <li>Détection automatique des objections</li>
                                <li>Recommandations personnalisées</li>
                                <li>Tableau de bord de performance</li>
                            </ul>
                        </div>
                        <div style="margin: 24px 0;">
                            <a href="${checkoutUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Activer maintenant
                            </a>
                        </div>
                        <p style="color: #6a6a6a; font-size: 14px;">Si vous avez besoin d'aide, répondez à cet email.</p>
                        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
                        <p style="color: #9a9a9a; font-size: 12px;">SuperSales - Votre assistant commercial IA</p>
                    </div>
                `,
            })

            console.log(`[Inngest] Final reminder email sent to ${userEmail}`)
            return true
        })

        console.log(`[Inngest] Subscription reminder flow completed for ${userEmail}`)

        return {
            success: true,
            userId,
            reason: 'All reminder emails sent',
            emailsSent: 2,
        }
    }
)
