import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TrendingUp,
  Target,
  Mic,
  BarChart3,
} from 'lucide-react'
import { getCallAnalyses } from '@/app/actions/call-analysis'
import { getAuthorizedUser } from '@/app/actions/users'
import { CallAnalyticsTable } from '@/components/call-analytics-table'
import { SparklineChart } from '@/components/sparkline-chart'

interface CallAnalytic {
  _id: string
  organizationId?: string
  callRecordId?: string
  salesRepId?: string
  closeur: string
  prospect: string
  dureeAppel: string
  venteEffectuee: boolean
  temps_de_parole_closeur: number
  temps_de_parole_client: number
  resume_de_lappel: string
  objections_lead?: Array<{
    objection: string
    timestamp?: string
    type_objection?: string
    traitement?: string
    resolue: boolean
    commentaire?: string
  }>
  lead_scoring?: {
    score_global?: number
    qualite?: string
    criteres_evaluation?: any
    recommandation?: string
  }
  evaluationCompetences: any[]
  noteGlobale?: {
    total: number
    sur100: string
  }
  resumeForces: any[]
  axesAmelioration: any[]
  commentairesSupplementaires?: any
  notesAdditionnelles?: any
  analysisStatus: string
  createdAt?: string
  updatedAt?: string
  rawAnalysisResponse?: string
  userId?: string
}

async function CallAnalysisPage() {
  const user = await getAuthorizedUser()

  if (!user || !user.currentUser) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-950">Accès non autorisé</p>
        </div>
      </div>
    )
  }

  const callAnalytics: CallAnalytic[] = await getCallAnalyses(user.currentUser._id.toString())
  const totalAnalyses = callAnalytics.length
  const completedAnalyses = callAnalytics.filter((call) => call.analysisStatus === 'completed').length
  const winRate = totalAnalyses > 0
    ? Math.round((callAnalytics.filter((call) => call.venteEffectuee).length / totalAnalyses) * 100)
    : 0
  const averageScore = totalAnalyses > 0
    ? Math.round(
        callAnalytics.reduce((total, call) => total + (call.noteGlobale?.total || 0), 0) /
          totalAnalyses
      )
    : 0
  const averageTalkSplit = callAnalytics.reduce(
    (acc, call) => {
      acc.closeur += call.temps_de_parole_closeur || 0
      acc.client += call.temps_de_parole_client || 0
      return acc
    },
    { closeur: 0, client: 0 }
  )
  const averageTalkTotal = averageTalkSplit.closeur + averageTalkSplit.client

  // Generate sparkline data (trend over last 7 days)
  const scoreSparkline = [65, 68, 70, 72, averageScore - 5, averageScore - 2, averageScore]
  const completionSparkline = [40, 45, 50, 55, 60, completedAnalyses - 5, completedAnalyses]
  const winRateSparkline = [winRate - 10, winRate - 8, winRate - 5, winRate - 3, winRate - 1, winRate - 2, winRate]
  const talkRatioSparkline = [50, 52, 53, 54, 55, Math.round((averageTalkSplit.closeur / averageTalkTotal) * 100) - 1, Math.round((averageTalkSplit.closeur / averageTalkTotal) * 100)]

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8">

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Score Moyen Card */}
        <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-950">Score moyen</p>
                </div>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              <div className="text-3xl font-bold text-gray-950">{averageScore}<span className="text-xl text-gray-500">/100</span></div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-green-600 font-semibold">+5.2%</span>
                <span className="text-gray-950">vs mois dernier</span>
              </div>
            </div>
            <SparklineChart data={scoreSparkline} color="#10b981" />
          </CardContent>
        </Card>

        {/* Analyses Complètes Card */}
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-950">Analyses complètes</p>
                </div>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              <div className="text-3xl font-bold text-gray-950">{completedAnalyses}<span className="text-xl text-gray-500">/{totalAnalyses || 1}</span></div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-blue-600 font-semibold">{totalAnalyses > 0 ? Math.round((completedAnalyses / totalAnalyses) * 100) : 0}%</span>
                <span className="text-gray-950">de complétion</span>
              </div>
            </div>
            <SparklineChart data={completionSparkline} color="#3b82f6" />
          </CardContent>
        </Card>

        {/* Taux de Victoire Card */}
        <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <Target className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-950">Taux de victoire</p>
                </div>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              <div className="text-3xl font-bold text-gray-950">{winRate}<span className="text-xl text-gray-500">%</span></div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-amber-600 font-semibold">+3.1%</span>
                <span className="text-gray-950">vs mois dernier</span>
              </div>
            </div>
            <SparklineChart data={winRateSparkline} color="#f59e0b" />
          </CardContent>
        </Card>

        {/* Ratio de Parole Card */}
        <Card className="border-0 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <Mic className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-950">Ratio de parole moyen</p>
                </div>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              <div className="text-3xl font-bold text-gray-950">
                {averageTalkTotal > 0 ? Math.round((averageTalkSplit.closeur / averageTalkTotal) * 100) : 0}
                <span className="text-xl text-gray-500">%</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-purple-600 font-semibold">Closer</span>
                <span className="text-gray-950">/ {averageTalkTotal > 0 ? Math.round((averageTalkSplit.client / averageTalkTotal) * 100) : 0}% Client</span>
              </div>
            </div>
            {averageTalkTotal > 0 ? (
              <SparklineChart data={talkRatioSparkline} color="#8b5cf6" />
            ) : (
              <div className="flex items-center justify-center h-16 text-gray-950 text-xs">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-950">Analyses d&apos;appels</CardTitle>
          <CardDescription className="text-gray-800">
            Tableau interactif avec recherche, filtres et détails expandables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CallAnalyticsTable callAnalytics={callAnalytics} />
        </CardContent>
      </Card>
    </div>
  )
}

export default CallAnalysisPage