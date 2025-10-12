import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Phone,
  TrendingUp,
  Target,
  Mic,
  BarChart3,
} from 'lucide-react'
import { getCallAnalyses } from '@/app/actions/call-analysis'
import { getAuthorizedUser } from '@/app/actions/users'
import { CallAnalyticsTable } from '@/components/call-analytics-table'

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
          <p className="text-gray-800">Accès non autorisé</p>
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

  return (
    <div className="space-y-8">

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-950">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Score moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-950">{averageScore}/100</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-950">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Analyses complètes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-950">
              {completedAnalyses}/{totalAnalyses || 1}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-950">
              <Target className="h-5 w-5 text-amber-600" />
              Taux de victoire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-950">{winRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-950">
              <Mic className="h-5 w-5 text-purple-600" />
              Ratio de parole moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-950">
              {averageTalkTotal > 0
                ? `${Math.round((averageTalkSplit.closeur / averageTalkTotal) * 100)}% closer · ${Math.round((averageTalkSplit.client / averageTalkTotal) * 100)}% client`
                : '—'}
            </div>
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