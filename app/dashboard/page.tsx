'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, Users, TrendingUp, Phone, Award, ArrowUpRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { DashboardChart } from '@/components/dashboard-chart'
import { SparklineChart } from '@/components/sparkline-chart'
import { useUser } from '@clerk/nextjs'
import { useDashboardData } from '@/hooks/use-dashboard-data'

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      <span className="ml-2 text-gray-700">Chargement...</span>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useUser()
  const { data: dashboardData, isLoading: loading, error } = useDashboardData()

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
            <p className="text-gray-700">Bienvenue ! Voici votre aperçu des ventes.</p>
          </div>
        </div>
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
            <p className="text-gray-700">Bienvenue ! Voici votre aperçu des ventes.</p>
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

  const { metrics, recentCalls, topPerformers, recentActivities, chartData, weeklySummary } = dashboardData || {}

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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-700">
            Bienvenue, {user?.firstName} ! Voici votre aperçu des ventes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Appels Card */}
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <Phone className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Total Appels</p>
                </div>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              <div className="text-3xl font-bold text-gray-900">{metrics?.totalCalls?.toLocaleString() || '0'}</div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-blue-600 font-semibold">+12%</span>
                <span className="text-gray-500">vs mois dernier</span>
              </div>
            </div>
            <SparklineChart data={callsSparkline} color="#3b82f6" />
          </CardContent>
        </Card>

        {/* Taux de Conversion Card */}
        <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Taux de Conversion</p>
                </div>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              <div className="text-3xl font-bold text-gray-900">{metrics?.conversionRate?.toFixed(1) || '0'}<span className="text-xl text-gray-500">%</span></div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-green-600 font-semibold">+2.1%</span>
                <span className="text-gray-500">vs mois dernier</span>
              </div>
            </div>
            <SparklineChart data={conversionSparkline} color="#10b981" />
          </CardContent>
        </Card>

        {/* Revenu Card */}
        <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <BarChart3 className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Revenu</p>
                </div>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              <div className="text-3xl font-bold text-gray-900">{metrics?.totalRevenue?.toLocaleString() || '0'}<span className="text-xl text-gray-500"> €</span></div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-amber-600 font-semibold">+18%</span>
                <span className="text-gray-500">vs mois dernier</span>
              </div>
            </div>
            <SparklineChart data={revenueSparkline} color="#f59e0b" />
          </CardContent>
        </Card>

        {/* Performance Équipe Card */}
        <Card className="border-0 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Performance Équipe</p>
                </div>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              <div className="text-3xl font-bold text-gray-900">{metrics?.teamPerformance || '0'}<span className="text-xl text-gray-500">%</span></div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-purple-600 font-semibold">+5%</span>
                <span className="text-gray-500">vs mois dernier</span>
              </div>
            </div>
            <SparklineChart data={performanceSparkline} color="#8b5cf6" />
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData && chartData.length > 0 && (
        <DashboardChart data={chartData} summary={weeklySummary} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-gray-950">Analyses d'appels</CardTitle>
                <CardDescription>Insights IA de vos derniers appels</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/call-analysis" className="text-zinc-800">
                  Tout Voir <ArrowUpRight className="ml-2 h-4 w-4 text-zinc-800" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCalls && recentCalls.length > 0 ? recentCalls.map((call: any) => {
                const palette = sentimentPalette[call.sentiment] || sentimentPalette.neutral

                return (
                  <div
                    key={call._id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${palette.dot}`} />
                      <div>
                        <p className={`text-sm font-medium capitalize ${palette.accent}`}>
                          Sentiment {call.sentiment === 'positive' ? 'positif' : call.sentiment === 'negative' ? 'négatif' : 'neutre'}
                        </p>
                        <p className={`text-xs ${palette.subtle}`}>
                          Appel avec {call.client}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${palette.accent}`}>{call.score}%</p>
                      <p className="text-xs text-gray-700">Score</p>
                    </div>
                  </div>
                )
              }) : (
                <div className="text-center py-8">
                  <p className="text-gray-700">Aucune analyse d'appel récente disponible</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-gray-950">Classement des Ventes</CardTitle>
                <CardDescription className="text-gray-800">Meilleurs performers ce mois-ci</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link className="text-zinc-800" href="/dashboard/sales-ranking">
                  Tout Voir <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers && topPerformers.length > 0 ? topPerformers.map((rep: any) => {
                const palette = rankPalette[rep.rank] || {
                  badge: 'bg-white/10 text-white',
                  accent: 'text-slate-200',
                }

                return (
                  <div
                    key={rep._id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold ${palette.badge}`}>
                        {rep.rank}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{rep.name}</p>
                        <p className="text-xs text-gray-600">{rep.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${palette.accent}`}>
                        {rep.totalRevenue?.toLocaleString() || '0'} €
                      </p>
                      <p className="text-xs text-gray-600">{rep.dealsClosedQTD || 0} ventes</p>
                    </div>
                  </div>
                )
              }) : (
                <div className="text-center py-8">
                  <p className="text-gray-700">Aucun commercial disponible</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-gray-950">Activité Récente</CardTitle>
          <CardDescription className="text-gray-800">Dernières mises à jour de votre équipe commerciale</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities && recentActivities.length > 0 ? recentActivities.map((activity: any, index: number) => {
              const colorConfigs: Record<string, { border: string; bg: string; icon: string }> = {
                green: { border: 'border-green-200', bg: 'bg-green-50', icon: 'text-green-600' },
                blue: { border: 'border-blue-200', bg: 'bg-blue-50', icon: 'text-blue-600' },
                purple: { border: 'border-purple-200', bg: 'bg-purple-50', icon: 'text-purple-600' }
              }
              const colorConfig = colorConfigs[activity.color as string] || { border: 'border-gray-200', bg: 'bg-gray-50', icon: 'text-gray-600' }

              const IconComponent = activity.icon === 'award' ? Award : activity.icon === 'phone' ? Phone : TrendingUp

              return (
                <div key={index} className="flex items-start gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${colorConfig.border} ${colorConfig.bg}`}>
                    <IconComponent className={`h-5 w-5 ${colorConfig.icon}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-700">{activity.description}</p>
                    <p className="text-xs text-gray-700">{activity.timeAgo}</p>
                  </div>
                </div>
              )
            }) : (
              <div className="text-center py-8">
                <p className="text-gray-700">Aucune activité récente disponible</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
