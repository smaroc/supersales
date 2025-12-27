import { inngest } from '@/lib/inngest.config'
import { Resend } from 'resend'
import connectToDatabase from '@/lib/mongodb'
import { User, CallAnalysis, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

const resend = new Resend(process.env.RESEND_API_KEY)

// Encouraging phrases for sales reps
const ENCOURAGEMENT_PHRASES = [
    "Continue sur cette lancée, chaque appel te rapproche de l'excellence !",
    "Ta persévérance paie, les résultats suivront !",
    "Chaque conversation est une opportunité d'apprentissage. Tu progresses !",
    "Les meilleurs closeurs sont ceux qui n'abandonnent jamais. Continue !",
    "Ton travail acharné finira par payer. Garde le cap !",
    "Cette semaine est une nouvelle chance de briller. Fonce !",
    "Chaque non te rapproche d'un oui. Continue d'appeler !",
    "La réussite appartient à ceux qui se lèvent tôt et persévèrent !",
    "Tu as tout ce qu'il faut pour réussir. Crois en toi !",
    "Les champions se construisent dans l'effort quotidien. Bravo pour ton engagement !",
]

function getRandomEncouragement(): string {
    return ENCOURAGEMENT_PHRASES[Math.floor(Math.random() * ENCOURAGEMENT_PHRASES.length)]
}

function getWeekDateRange(): { start: Date; end: Date } {
    const now = new Date()
    // Get last Monday
    const dayOfWeek = now.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const lastMonday = new Date(now)
    lastMonday.setDate(now.getDate() - daysToSubtract - 7)
    lastMonday.setHours(0, 0, 0, 0)

    // Get last Sunday
    const lastSunday = new Date(lastMonday)
    lastSunday.setDate(lastMonday.getDate() + 6)
    lastSunday.setHours(23, 59, 59, 999)

    return { start: lastMonday, end: lastSunday }
}

interface SalesRepStats {
    totalCalls: number
    salesWon: number
    salesLost: number
    winRate: number
    averageScore: number
    noShowCount: number
    pitchCount: number
    topStrength: string | null
    topImprovement: string | null
}

interface HeadOfSalesStats {
    totalCalls: number
    totalSales: number
    winRate: number
    noShowRate: number
    pitchRate: number
    topClosers: Array<{ name: string; sales: number; winRate: number }>
    topObjections: Array<{ objection: string; count: number; resolvedRate: number }>
    averageScore: number
}

async function getSalesRepWeeklyStats(
    db: any,
    userIdString: string,
    salesRepId: string,
    weekStart: Date,
    weekEnd: Date
): Promise<SalesRepStats> {
    // Query by both userId and salesRepId since different sources may store differently
    const analyses = await db.collection(COLLECTIONS.CALL_ANALYSIS)
        .find({
            $or: [
                { userId: userIdString },
                { salesRepId: salesRepId }
            ],
            createdAt: { $gte: weekStart, $lte: weekEnd },
            analysisStatus: 'completed'
        })
        .toArray()

    const totalCalls = analyses.length
    const salesWon = analyses.filter((a: CallAnalysis) => a.venteEffectuee).length
    const salesLost = totalCalls - salesWon
    const winRate = totalCalls > 0 ? Math.round((salesWon / totalCalls) * 100) : 0

    const scores = analyses
        .filter((a: CallAnalysis) => a.noteGlobale?.total)
        .map((a: CallAnalysis) => a.noteGlobale!.total)
    const averageScore = scores.length > 0
        ? Math.round(scores.reduce((sum: number, s: number) => sum + s, 0) / scores.length)
        : 0

    const noShowCount = analyses.filter((a: CallAnalysis) => a.no_show).length
    const pitchCount = analyses.filter((a: CallAnalysis) => a.pitch_effectue).length

    // Find most common strength
    const strengths = analyses
        .filter((a: CallAnalysis) => a.partie_excellente)
        .map((a: CallAnalysis) => a.partie_excellente!)
    const topStrength = strengths.length > 0 ? strengths[0] : null

    // Find most common improvement area
    const improvements = analyses
        .filter((a: CallAnalysis) => a.partie_a_travailler)
        .map((a: CallAnalysis) => a.partie_a_travailler!)
    const topImprovement = improvements.length > 0 ? improvements[0] : null

    return {
        totalCalls,
        salesWon,
        salesLost,
        winRate,
        averageScore,
        noShowCount,
        pitchCount,
        topStrength,
        topImprovement,
    }
}

async function getHeadOfSalesWeeklyStats(
    db: any,
    organizationId: ObjectId | string,
    weekStart: Date,
    weekEnd: Date
): Promise<HeadOfSalesStats> {
    const orgId = typeof organizationId === 'string' ? new ObjectId(organizationId) : organizationId
    const analyses = await db.collection(COLLECTIONS.CALL_ANALYSIS)
        .find({
            organizationId: orgId,
            createdAt: { $gte: weekStart, $lte: weekEnd },
            analysisStatus: 'completed'
        })
        .toArray()

    const totalCalls = analyses.length
    const totalSales = analyses.filter((a: CallAnalysis) => a.venteEffectuee).length
    const winRate = totalCalls > 0 ? Math.round((totalSales / totalCalls) * 100) : 0

    const noShowCount = analyses.filter((a: CallAnalysis) => a.no_show).length
    const noShowRate = totalCalls > 0 ? Math.round((noShowCount / totalCalls) * 100) : 0

    const pitchCount = analyses.filter((a: CallAnalysis) => a.pitch_effectue).length
    const pitchRate = totalCalls > 0 ? Math.round((pitchCount / totalCalls) * 100) : 0

    const scores = analyses
        .filter((a: CallAnalysis) => a.noteGlobale?.total)
        .map((a: CallAnalysis) => a.noteGlobale!.total)
    const averageScore = scores.length > 0
        ? Math.round(scores.reduce((sum: number, s: number) => sum + s, 0) / scores.length)
        : 0

    // Calculate top closers
    const closerStats: Record<string, { name: string; total: number; sales: number }> = {}
    for (const analysis of analyses) {
        const closerName = analysis.closeur || 'Inconnu'
        if (!closerStats[closerName]) {
            closerStats[closerName] = { name: closerName, total: 0, sales: 0 }
        }
        closerStats[closerName].total++
        if (analysis.venteEffectuee) {
            closerStats[closerName].sales++
        }
    }

    const topClosers = Object.values(closerStats)
        .map(c => ({
            name: c.name,
            sales: c.sales,
            winRate: c.total > 0 ? Math.round((c.sales / c.total) * 100) : 0
        }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5)

    // Calculate top objections
    const objectionStats: Record<string, { objection: string; total: number; resolved: number }> = {}
    for (const analysis of analyses) {
        if (analysis.objections_lead) {
            for (const obj of analysis.objections_lead) {
                const objText = obj.objection
                if (!objectionStats[objText]) {
                    objectionStats[objText] = { objection: objText, total: 0, resolved: 0 }
                }
                objectionStats[objText].total++
                if (obj.resolue) {
                    objectionStats[objText].resolved++
                }
            }
        }
    }

    const topObjections = Object.values(objectionStats)
        .map(o => ({
            objection: o.objection,
            count: o.total,
            resolvedRate: o.total > 0 ? Math.round((o.resolved / o.total) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

    return {
        totalCalls,
        totalSales,
        winRate,
        noShowRate,
        pitchRate,
        topClosers,
        topObjections,
        averageScore,
    }
}

function formatDateRange(start: Date, end: Date): string {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
    const startStr = start.toLocaleDateString('fr-FR', options)
    const endStr = end.toLocaleDateString('fr-FR', options)
    return `${startStr} - ${endStr}`
}

// Inngest function for weekly reports - runs every Monday at 8AM Paris time
export const weeklyReport = inngest.createFunction(
    {
        id: 'weekly-report',
        name: 'Weekly Performance Report',
    },
    { cron: 'TZ=Europe/Paris 0 8 * * 1' }, // Every Monday at 8:00 AM Paris time
    async ({ step }) => {
        console.log('[Inngest] Starting weekly report generation')

        const { start: weekStart, end: weekEnd } = getWeekDateRange()
        const dateRangeStr = formatDateRange(weekStart, weekEnd)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://supersales.dev'

        // Step 1: Get all active users with paid access
        const users = await step.run('fetch-users', async () => {
            const { db } = await connectToDatabase()
            return await db.collection<User>(COLLECTIONS.USERS)
                .find({
                    hasAccess: true,
                    isActive: true,
                    isDeleted: { $ne: true }
                })
                .toArray()
        })

        console.log(`[Inngest] Found ${users.length} active users with paid access`)

        let salesRepEmailsSent = 0
        let hosEmailsSent = 0

        // Step 2: Process each user
        for (const user of users) {
            const isHeadOfSales = user.role === 'head_of_sales' || user.isAdmin || user.isSuperAdmin

            // Send sales rep report to all users (including HoS for their own calls)
            await step.run(`send-salesrep-report-${user._id}`, async () => {
                try {
                    const { db } = await connectToDatabase()
                    const userIdStr = user._id!.toString()
                    const stats = await getSalesRepWeeklyStats(
                        db,
                        userIdStr,
                        userIdStr, // salesRepId is typically the user's _id
                        weekStart,
                        weekEnd
                    )

                    // Skip if no calls this week
                    if (stats.totalCalls === 0) {
                        console.log(`[Inngest] No calls for user ${user.email} this week - skipping`)
                        return false
                    }

                    const encouragement = getRandomEncouragement()
                    const dashboardUrl = `${baseUrl}/dashboard/call-analysis`

                    await resend.emails.send({
                        from: 'SuperSales <noreply@mail.supersales.dev>',
                        to: user.email,
                        subject: `📊 Ton bilan de la semaine (${dateRangeStr})`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
                                <div style="background-color: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                    <h2 style="color: #1a1a1a; margin-top: 0;">Bonjour ${user.firstName} !</h2>
                                    <p style="color: #4a4a4a;">Voici ton bilan de la semaine du <strong>${dateRangeStr}</strong> :</p>

                                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
                                        <table style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 8px 0; color: #4a4a4a;">📞 Appels analysés</td>
                                                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #1a1a1a;">${stats.totalCalls}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #4a4a4a;">✅ Ventes gagnées</td>
                                                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #16a34a;">${stats.salesWon}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #4a4a4a;">❌ Ventes perdues</td>
                                                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #dc2626;">${stats.salesLost}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #4a4a4a;">🎯 Taux de conversion</td>
                                                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #2563eb;">${stats.winRate}%</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #4a4a4a;">⭐ Score moyen</td>
                                                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #7c3aed;">${stats.averageScore}/100</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #4a4a4a;">🎤 Pitches effectués</td>
                                                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0891b2;">${stats.pitchCount}/${stats.totalCalls}</td>
                                            </tr>
                                        </table>
                                    </div>

                                    ${stats.topStrength ? `
                                    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
                                        <p style="margin: 0; color: #065f46; font-weight: bold;">💪 Ton point fort</p>
                                        <p style="margin: 8px 0 0 0; color: #047857;">${stats.topStrength}</p>
                                    </div>
                                    ` : ''}

                                    ${stats.topImprovement ? `
                                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
                                        <p style="margin: 0; color: #92400e; font-weight: bold;">🎯 À travailler cette semaine</p>
                                        <p style="margin: 8px 0 0 0; color: #a16207;">${stats.topImprovement}</p>
                                    </div>
                                    ` : ''}

                                    <div style="background-color: #eff6ff; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
                                        <p style="color: #1e40af; font-style: italic; margin: 0; font-size: 16px;">"${encouragement}"</p>
                                    </div>

                                    <div style="text-align: center; margin: 24px 0;">
                                        <a href="${dashboardUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                                            Voir mes analyses détaillées
                                        </a>
                                    </div>
                                </div>
                                <p style="color: #9a9a9a; font-size: 12px; text-align: center; margin-top: 20px;">SuperSales - Votre assistant commercial IA</p>
                            </div>
                        `,
                    })

                    console.log(`[Inngest] Sales rep weekly report sent to ${user.email}`)
                    return true
                } catch (error) {
                    console.error(`[Inngest] Failed to send sales rep report to ${user.email}:`, error)
                    return false
                }
            })

            salesRepEmailsSent++

            // Send Head of Sales report for managers
            if (isHeadOfSales) {
                await step.run(`send-hos-report-${user._id}`, async () => {
                    try {
                        const { db } = await connectToDatabase()
                        const stats = await getHeadOfSalesWeeklyStats(
                            db,
                            user.organizationId,
                            weekStart,
                            weekEnd
                        )

                        // Skip if no calls this week
                        if (stats.totalCalls === 0) {
                            console.log(`[Inngest] No team calls for HoS ${user.email} this week - skipping`)
                            return false
                        }

                        const dashboardUrl = `${baseUrl}/dashboard/head-of-sales`

                        const topClosersHtml = stats.topClosers.length > 0
                            ? stats.topClosers.map((c, i) => `
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•'} ${c.name}</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${c.sales}</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${c.winRate}%</td>
                                </tr>
                            `).join('')
                            : '<tr><td colspan="3" style="padding: 8px; text-align: center; color: #6b7280;">Aucune donnée</td></tr>'

                        const topObjectionsHtml = stats.topObjections.length > 0
                            ? stats.topObjections.map(o => `
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${o.objection.substring(0, 50)}${o.objection.length > 50 ? '...' : ''}</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${o.count}</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${o.resolvedRate}%</td>
                                </tr>
                            `).join('')
                            : '<tr><td colspan="3" style="padding: 8px; text-align: center; color: #6b7280;">Aucune objection</td></tr>'

                        await resend.emails.send({
                            from: 'SuperSales <noreply@mail.supersales.dev>',
                            to: user.email,
                            subject: `📈 Rapport d'équipe - Semaine du ${dateRangeStr}`,
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
                                    <div style="background-color: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                        <h2 style="color: #1a1a1a; margin-top: 0;">📊 Rapport de performance équipe</h2>
                                        <p style="color: #4a4a4a;">Semaine du <strong>${dateRangeStr}</strong></p>

                                        <!-- Key Metrics -->
                                        <div style="display: flex; gap: 12px; margin: 20px 0; flex-wrap: wrap;">
                                            <div style="flex: 1; min-width: 120px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 8px; padding: 16px; text-align: center;">
                                                <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 12px;">APPELS</p>
                                                <p style="color: white; margin: 4px 0 0 0; font-size: 28px; font-weight: bold;">${stats.totalCalls}</p>
                                            </div>
                                            <div style="flex: 1; min-width: 120px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 16px; text-align: center;">
                                                <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 12px;">VENTES</p>
                                                <p style="color: white; margin: 4px 0 0 0; font-size: 28px; font-weight: bold;">${stats.totalSales}</p>
                                            </div>
                                            <div style="flex: 1; min-width: 120px; background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); border-radius: 8px; padding: 16px; text-align: center;">
                                                <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 12px;">TAUX CONV.</p>
                                                <p style="color: white; margin: 4px 0 0 0; font-size: 28px; font-weight: bold;">${stats.winRate}%</p>
                                            </div>
                                        </div>

                                        <!-- Rates -->
                                        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
                                            <table style="width: 100%; border-collapse: collapse;">
                                                <tr>
                                                    <td style="padding: 8px 0; color: #4a4a4a;">🎤 Taux de pitch effectué</td>
                                                    <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${stats.pitchRate >= 80 ? '#16a34a' : stats.pitchRate >= 50 ? '#f59e0b' : '#dc2626'};">${stats.pitchRate}%</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; color: #4a4a4a;">👻 Taux de no-show</td>
                                                    <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${stats.noShowRate <= 10 ? '#16a34a' : stats.noShowRate <= 25 ? '#f59e0b' : '#dc2626'};">${stats.noShowRate}%</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; color: #4a4a4a;">⭐ Score moyen équipe</td>
                                                    <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #7c3aed;">${stats.averageScore}/100</td>
                                                </tr>
                                            </table>
                                        </div>

                                        <!-- Top Closers -->
                                        <h3 style="color: #1a1a1a; margin: 24px 0 12px 0;">🏆 Top Closers</h3>
                                        <table style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
                                            <thead>
                                                <tr style="background-color: #e5e7eb;">
                                                    <th style="padding: 10px; text-align: left; color: #374151; font-size: 12px;">CLOSEUR</th>
                                                    <th style="padding: 10px; text-align: center; color: #374151; font-size: 12px;">VENTES</th>
                                                    <th style="padding: 10px; text-align: right; color: #374151; font-size: 12px;">TAUX</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${topClosersHtml}
                                            </tbody>
                                        </table>

                                        <!-- Top Objections -->
                                        <h3 style="color: #1a1a1a; margin: 24px 0 12px 0;">🎯 Objections fréquentes</h3>
                                        <table style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
                                            <thead>
                                                <tr style="background-color: #e5e7eb;">
                                                    <th style="padding: 10px; text-align: left; color: #374151; font-size: 12px;">OBJECTION</th>
                                                    <th style="padding: 10px; text-align: center; color: #374151; font-size: 12px;">FOIS</th>
                                                    <th style="padding: 10px; text-align: right; color: #374151; font-size: 12px;">RÉSOLUES</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${topObjectionsHtml}
                                            </tbody>
                                        </table>

                                        <div style="text-align: center; margin: 24px 0;">
                                            <a href="${dashboardUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                                                Voir le tableau de bord complet
                                            </a>
                                        </div>
                                    </div>
                                    <p style="color: #9a9a9a; font-size: 12px; text-align: center; margin-top: 20px;">SuperSales - Votre assistant commercial IA</p>
                                </div>
                            `,
                        })

                        console.log(`[Inngest] Head of Sales weekly report sent to ${user.email}`)
                        return true
                    } catch (error) {
                        console.error(`[Inngest] Failed to send HoS report to ${user.email}:`, error)
                        return false
                    }
                })

                hosEmailsSent++
            }
        }

        console.log(`[Inngest] Weekly reports completed: ${salesRepEmailsSent} sales rep emails, ${hosEmailsSent} HoS emails`)

        return {
            success: true,
            weekRange: dateRangeStr,
            salesRepEmailsSent,
            hosEmailsSent,
            totalUsers: users.length,
        }
    }
)
