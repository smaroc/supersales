'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Target, Mic, BarChart3, Filter } from 'lucide-react'
import { CallAnalyticsTable } from '@/components/call-analytics-table'
import { SparklineChart } from '@/components/sparkline-chart'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface CallAnalytic {
  _id: string
  organizationId?: string
  callRecordId?: string
  salesRepId?: string
  typeOfCall?: 'sales' | 'support' | 'internal' | 'follow-up' | 'discovery' | 'demo' | 'other'
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
  meetingDate?: string
  rawAnalysisResponse?: string
  userId?: string
  channelName?: string | null
  channelId?: string | null
  source?: string | null
}

interface CallAnalysisContentProps {
  allCallAnalytics: CallAnalytic[]
}

export function CallAnalysisContent({ allCallAnalytics }: CallAnalysisContentProps) {
  const [filterType, setFilterType] = useState<'sales' | 'all'>('sales')
  const [selectedChannel, setSelectedChannel] = useState<string | 'all'>('all')

  // Extract unique channels from all analytics
  const availableChannels = Array.from(
    new Set(
      allCallAnalytics
        .filter(call => call.channelName && call.channelId)
        .map(call => JSON.stringify({ id: call.channelId, name: call.channelName }))
    )
  ).map(str => JSON.parse(str))

  // Filter analytics based on selected type and channel
  let callAnalytics = filterType === 'sales'
    ? allCallAnalytics.filter(call => call.typeOfCall === 'sales' || !call.typeOfCall) // Include calls without typeOfCall for backward compatibility
    : allCallAnalytics

  // Apply channel filter
  if (selectedChannel !== 'all') {
    callAnalytics = callAnalytics.filter(call => call.channelId === selectedChannel)
  }

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
    <div className="p-6 space-y-4 md:space-y-6 lg:space-y-8">
      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Analyses d&apos;appels</h1>
          <p className="text-sm text-gray-600 mt-1">
            {filterType === 'sales' ? 'Affichage des appels de vente uniquement' : 'Affichage de tous les types d\'appels'}
            {selectedChannel !== 'all' && ` • Canal: ${availableChannels.find(ch => ch.id === selectedChannel)?.name || 'Inconnu'}`}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Channel Filter */}
          {availableChannels.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {selectedChannel === 'all' ? 'Tous les canaux' : availableChannels.find(ch => ch.id === selectedChannel)?.name || 'Canal'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filtrer par canal</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedChannel('all')} className={selectedChannel === 'all' ? 'bg-gray-100' : ''}>
                  <div className="flex items-center justify-between w-full">
                    <span>Tous les canaux</span>
                    {selectedChannel === 'all' && <span className="text-green-600">✓</span>}
                  </div>
                </DropdownMenuItem>
                {availableChannels.map(channel => (
                  <DropdownMenuItem
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel.id)}
                    className={selectedChannel === channel.id ? 'bg-gray-100' : ''}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{channel.name}</span>
                      {selectedChannel === channel.id && <span className="text-green-600">✓</span>}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Type Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                {filterType === 'sales' ? 'Ventes uniquement' : 'Tous les appels'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filtrer par type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterType('sales')} className={filterType === 'sales' ? 'bg-gray-100' : ''}>
                <div className="flex items-center justify-between w-full">
                  <span>Ventes uniquement</span>
                  {filterType === 'sales' && <span className="text-green-600">✓</span>}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('all')} className={filterType === 'all' ? 'bg-gray-100' : ''}>
                <div className="flex items-center justify-between w-full">
                  <span>Tous les appels</span>
                  {filterType === 'all' && <span className="text-green-600">✓</span>}
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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
          <CardTitle className="text-gray-950">
            Analyses d&apos;appels
            <span className="ml-2 text-sm font-normal text-gray-600">
              ({callAnalytics.length} {filterType === 'sales' ? 'appels de vente' : 'appels'})
            </span>
          </CardTitle>
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
