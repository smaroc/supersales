'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Users, TrendingUp, Phone, Award, ArrowUpRight, Loader2, AlertCircle, Calendar } from 'lucide-react'
import Link from 'next/link'
import { DashboardChart } from '@/components/dashboard-chart'
import { SparklineChart } from '@/components/sparkline-chart'
import { useUser } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import { getAllDashboardData } from '@/app/actions/dashboard'
import { useImpersonationRefresh } from '@/lib/hooks/use-impersonation-refresh'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const PERIOD_OPTIONS = [
  { label: '7 derniers jours', value: 7 },
  { label: '30 derniers jours', value: 30 },
  { label: '90 derniers jours', value: 90 },
  { label: 'Cette année', value: 365 },
]

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      <span className="ml-2 text-gray-700 dark:text-gray-300">Chargement...</span>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useUser()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(30)

  const fetchData = useCallback(async (days: number = selectedPeriod) => {
    try {
      console.log('[Dashboard] Fetching dashboard data for', days, 'days...')
      setLoading(true)
      const data = await getAllDashboardData(days)
      setDashboardData(data)
      setError(null)
      console.log('[Dashboard] Dashboard data loaded successfully')
    } catch (err) {
      setError(err as Error)
      console.error('[Dashboard] Error loading dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod])

  useEffect(() => {
    if (user) {
      fetchData(selectedPeriod)
    }
  }, [user, selectedPeriod])

  // Refresh data when impersonation changes
  useImpersonationRefresh(() => fetchData(selectedPeriod))

  const handlePeriodChange = (days: number) => {
    setSelectedPeriod(days)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tableau de bord</h1>
            <p className="text-gray-700 dark:text-gray-300">Bienvenue ! Voici votre aperçu des ventes.</p>
          </div>
        </div>
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tableau de bord</h1>
            <p className="text-gray-700 dark:text-gray-300">Bienvenue ! Voici votre aperçu des ventes.</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="mb-4 text-red-600">{error.message || 'Échec du chargement des données'}</p>
            <Button onClick={() => window.location.reload()}>
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { metrics, recentCalls, topPerformers, recentActivities, chartData, weeklySummary, topObjections, averageLeadScore } = dashboardData || {}

  // Generate sparkline data for metrics
  const callsSparkline = [80, 85, 90, 95, (metrics?.totalCalls ?? 100) - 20, (metrics?.totalCalls ?? 110) - 10, metrics?.totalCalls ?? 120]
  const conversionSparkline = [20, 22, 24, 26, (metrics?.conversionRate ?? 28) - 3, (metrics?.conversionRate ?? 30) - 1, metrics?.conversionRate ?? 32]
  const revenueSparkline = [8000, 9000, 10000, 11000, (metrics?.totalRevenue ?? 12000) - 2000, (metrics?.totalRevenue ?? 13000) - 1000, metrics?.totalRevenue ?? 14000]
  const performanceSparkline = [70, 75, 78, 80, (metrics?.teamPerformance ?? 82) - 5, (metrics?.teamPerformance ?? 85) - 2, metrics?.teamPerformance ?? 87]

  const sentimentPalette: Record<string, { dot: string; accent: string; subtle: string }> = {
    positive: {
      dot: 'bg-green-500',
      accent: 'text-green-700',
      subtle: 'text-green-600',
    },
    negative: {
      dot: 'bg-red-500',
      accent: 'text-red-700',
      subtle: 'text-red-600',
    },
    neutral: {
      dot: 'bg-blue-500',
      accent: 'text-blue-700',
      subtle: 'text-blue-600',
    },
  }

  const rankPalette: Record<number, { badge: string; accent: string }> = {
    1: {
      badge: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      accent: 'text-yellow-700',
    },
    2: {
      badge: 'bg-gray-100 text-gray-800 border border-gray-200',
      accent: 'text-gray-700',
    },
    3: {
      badge: 'bg-orange-100 text-orange-800 border border-orange-200',
      accent: 'text-orange-700',
    },
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tableau de bord</h1>
          <p className="text-gray-700 dark:text-gray-300">
            Bienvenue, {user?.firstName} ! Voici votre aperçu des ventes.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              {PERIOD_OPTIONS.find(p => p.value === selectedPeriod)?.label || '30 derniers jours'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {PERIOD_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handlePeriodChange(option.value)}
                className={selectedPeriod === option.value ? 'bg-gray-100 dark:bg-zinc-700' : ''}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{option.label}</span>
                  {selectedPeriod === option.value && <span className="text-green-600">✓</span>}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Appels Card */}
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white dark:bg-zinc-800 rounded-full shadow-sm">
                  <Phone className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Appels</p>
                </div>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{metrics?.totalCalls?.toLocaleString() || '0'}</div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-blue-600 font-semibold">+12%</span>
                <span className="text-gray-500 dark:text-gray-400">vs mois dernier</span>
              </div>
            </div>
            <SparklineChart data={callsSparkline} color="#3b82f6" />
          </CardContent>
        </Card>

        {/* Taux de Conversion Card */}
        <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white dark:bg-zinc-800 rounded-full shadow-sm">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Taux de Conversion</p>
                </div>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{metrics?.conversionRate?.toFixed(1) || '0'}<span className="text-xl text-gray-500 dark:text-gray-400">%</span></div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-green-600 font-semibold">+2.1%</span>
                <span className="text-gray-500 dark:text-gray-400">vs mois dernier</span>
              </div>
            </div>
            <SparklineChart data={conversionSparkline} color="#10b981" />
          </CardContent>
        </Card>

        {/* Revenu Card */}
        <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white dark:bg-zinc-800 rounded-full shadow-sm">
                  <BarChart3 className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Revenu Total</p>
                </div>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{metrics?.totalRevenue?.toLocaleString() || '0'}<span className="text-xl text-gray-500 dark:text-gray-400"> €</span></div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-amber-600 font-semibold">+18%</span>
                <span className="text-gray-500 dark:text-gray-400">vs mois dernier</span>
              </div>
            </div>
            <SparklineChart data={revenueSparkline} color="#f59e0b" />
          </CardContent>
        </Card>

        {/* Performance Équipe Card */}
        <Card className="border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-purple-950 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white dark:bg-zinc-800 rounded-full shadow-sm">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Performance Équipe</p>
                </div>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{metrics?.teamPerformance || '0'}<span className="text-xl text-gray-500 dark:text-gray-400">%</span></div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-purple-600 font-semibold">+5%</span>
                <span className="text-gray-500 dark:text-gray-400">vs mois dernier</span>
              </div>
            </div>
            <SparklineChart data={performanceSparkline} color="#8b5cf6" />
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData && chartData.length > 0 && (
        <DashboardChart data={chartData} summary={weeklySummary} periodDays={selectedPeriod} />
      )}

      {/* Insights Cards Grid */}
      {(topObjections && topObjections.length > 0) || averageLeadScore ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Objections Card */}
          {topObjections && topObjections.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-gray-950 dark:text-white text-base">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  Top Objections
                </CardTitle>
                <CardDescription className="text-xs">Les objections les plus fréquentes</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {topObjections.slice(0, 5).map((objection: any, index: number) => {
                    const rankColors = [
                      { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800 border-orange-300' },
                      { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
                      { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
                      { bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-700', badge: 'bg-lime-100 text-lime-800 border-lime-300' },
                      { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
                    ]
                    const colorScheme = rankColors[index] || rankColors[4]

                    return (
                      <div
                        key={index}
                        className={`flex items-start justify-between rounded-lg border ${colorScheme.border} ${colorScheme.bg} p-2`}
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${colorScheme.badge} font-semibold text-[10px]`}>
                            #{index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold ${colorScheme.text} line-clamp-2`}>
                              {objection.objection}
                            </p>
                            {objection.type && (
                              <Badge variant="outline" className="mt-0.5 text-[10px] h-4 px-1">
                                {objection.type}
                              </Badge>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-600 dark:text-gray-400">
                              <span>
                                <span className="font-semibold">{objection.count}</span> fois
                              </span>
                              <span className={`font-semibold ${objection.resolutionRate >= 70 ? 'text-green-600' : objection.resolutionRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                {objection.resolutionRate}% résolues
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Average Lead Score Card */}
          {averageLeadScore && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-gray-950 dark:text-white text-base">
                  <Award className="h-4 w-4 text-indigo-600" />
                  Qualité Moyenne des Leads
                </CardTitle>
                <CardDescription className="text-xs">Score moyen de qualité des leads</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-center py-4">
                  <div className="text-center w-full">
                    <div className="text-4xl font-bold text-indigo-600">
                      {averageLeadScore.averageScore}
                      <span className="text-2xl text-gray-600 dark:text-gray-400">/10</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      Basé sur {averageLeadScore.totalAnalyses} analyse{averageLeadScore.totalAnalyses > 1 ? 's' : ''}
                    </p>
                    <div className="mt-3 w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${(parseFloat(averageLeadScore.averageScore) / 10) * 100}%` }}
                      ></div>
                    </div>
                    {parseFloat(averageLeadScore.averageScore) >= 8 && (
                      <Badge className="mt-3 bg-green-100 text-green-800 border-green-300 text-xs">
                        Excellente qualité
                      </Badge>
                    )}
                    {parseFloat(averageLeadScore.averageScore) >= 6 && parseFloat(averageLeadScore.averageScore) < 8 && (
                      <Badge className="mt-3 bg-blue-100 text-blue-800 border-blue-300 text-xs">
                        Bonne qualité
                      </Badge>
                    )}
                    {parseFloat(averageLeadScore.averageScore) < 6 && (
                      <Badge className="mt-3 bg-amber-100 text-amber-800 border-amber-300 text-xs">
                        Qualité à améliorer
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-gray-950 dark:text-white text-base">Analyses d&apos;appels</CardTitle>
                <CardDescription className="text-xs">Insights IA de vos derniers appels</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                <Link href="/dashboard/call-analysis" className="text-zinc-800">
                  Tout Voir <ArrowUpRight className="ml-1 h-3 w-3 text-zinc-800" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {recentCalls && recentCalls.length > 0 ? recentCalls.slice(0, 6).map((call: any) => {
                const palette = sentimentPalette[call.sentiment] || sentimentPalette.neutral

                return (
                  <div
                    key={call._id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${palette.dot}`} />
                      <div className="min-w-0">
                        <p className={`text-xs font-medium capitalize ${palette.accent}`}>
                          Sentiment {call.sentiment === 'positive' ? 'positif' : call.sentiment === 'negative' ? 'négatif' : 'neutre'}
                        </p>
                        <p className={`text-[10px] ${palette.subtle} truncate`}>
                          Appel avec {call.client}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-semibold ${palette.accent}`}>{call.score}%</p>
                      <p className="text-[10px] text-gray-700 dark:text-gray-300">Score</p>
                    </div>
                  </div>
                )
              }) : (
                <div className="text-center py-8">
                  <p className="text-gray-700 dark:text-gray-300 text-sm">Aucune analyse d&apos;appel récente disponible</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-gray-950 dark:text-white text-base">Classement des Ventes</CardTitle>
                <CardDescription className="text-gray-800 dark:text-gray-300 text-xs">Meilleurs performers ce mois-ci</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                <Link className="text-zinc-800" href="/dashboard/sales-ranking">
                  Tout Voir <ArrowUpRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {topPerformers && topPerformers.length > 0 ? topPerformers.slice(0, 6).map((rep: any) => {
                const palette = rankPalette[rep.rank] || {
                  badge: 'bg-white/10 text-white',
                  accent: 'text-slate-200',
                }

                return (
                  <div
                    key={rep._id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${palette.badge}`}>
                        {rep.rank}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{rep.name}</p>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate">{rep.role}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-xs font-semibold ${palette.accent}`}>
                        {rep.totalRevenue?.toLocaleString() || '0'} €
                      </p>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400">{rep.dealsClosedQTD || 0} ventes</p>
                    </div>
                  </div>
                )
              }) : (
                <div className="text-center py-8">
                  <p className="text-gray-700 dark:text-gray-300 text-sm">Aucun commercial disponible</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-gray-950 dark:text-white text-base">Activité Récente</CardTitle>
          <CardDescription className="text-gray-800 dark:text-gray-300 text-xs">Dernières mises à jour de votre équipe commerciale</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentActivities && recentActivities.length > 0 ? recentActivities.slice(0, 9).map((activity: any, index: number) => {
              const colorConfigs: Record<string, { border: string; bg: string; icon: string }> = {
                green: { border: 'border-green-200', bg: 'bg-green-50', icon: 'text-green-600' },
                blue: { border: 'border-blue-200', bg: 'bg-blue-50', icon: 'text-blue-600' },
                purple: { border: 'border-purple-200', bg: 'bg-purple-50', icon: 'text-purple-600' }
              }
              const colorConfig = colorConfigs[activity.color as string] || { border: 'border-gray-200', bg: 'bg-gray-50', icon: 'text-gray-600' }

              const IconComponent = activity.icon === 'award' ? Award : activity.icon === 'phone' ? Phone : TrendingUp

              return (
                <div key={index} className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 p-3">
                  <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border ${colorConfig.border} ${colorConfig.bg}`}>
                    <IconComponent className={`h-3.5 w-3.5 ${colorConfig.icon}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-1">{activity.title}</p>
                    <p className="text-[10px] text-gray-700 dark:text-gray-300 line-clamp-2">{activity.description}</p>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">{activity.timeAgo}</p>
                  </div>
                </div>
              )
            }) : (
              <div className="text-center py-8 col-span-full">
                <p className="text-gray-700 dark:text-gray-300 text-sm">Aucune activité récente disponible</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
