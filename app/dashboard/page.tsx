'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, Users, TrendingUp, Phone, Award, ArrowUpRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getDashboardMetrics, getRecentActivities } from '@/app/actions/dashboard-metrics'
import { getRecentCallAnalyses } from '@/app/actions/call-analysis'
import { getTopPerformers } from '@/app/actions/sales-reps'
import { getDashboardChartData, getWeeklySummary } from '@/app/actions/dashboard-charts'
import { DashboardChart } from '@/components/dashboard-chart'
import { useUser } from '@clerk/nextjs'

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      <span className="ml-2 text-gray-700">Chargement...</span>
    </div>
  )
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const [dashboardData, setDashboardData] = useState<{
    metrics: any
    recentCalls: any[]
    topPerformers: any[]
    recentActivities: any[]
    chartData: any[]
    weeklySummary: any
  } | null>(null)
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return

      try {
        const response = await fetch(`/api/users/by-clerk-id/${user.id}`)
        if (response.ok) {
          const data = await response.json()
          setUserData(data)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    if (isLoaded && user) {
      fetchUserData()
    }
  }, [user, isLoaded])

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userData?.organizationId) return

      try {
        setLoading(true)
        setError(null)

        const [metrics, recentCalls, topPerformers, recentActivities, chartData, weeklySummary] = await Promise.all([
          getDashboardMetrics(userData.organizationId),
          getRecentCallAnalyses(userData.organizationId, 3),
          getTopPerformers(userData.organizationId, 3),
          getRecentActivities(userData.organizationId, 3),
          getDashboardChartData(30),
          getWeeklySummary()
        ])

        setDashboardData({
          metrics,
          recentCalls,
          topPerformers,
          recentActivities,
          chartData,
          weeklySummary
        })
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [userData?.organizationId])

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
            <p className="mb-4 text-red-600">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { metrics, recentCalls, topPerformers, recentActivities, chartData, weeklySummary } = dashboardData || {}

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
            Bienvenue, {user?.firstName || userData?.firstName} ! Voici votre aperçu des ventes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-950">Total Appels</CardTitle>
            <Phone className="h-4 w-4 text-gray-950" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-950">{metrics?.totalCalls?.toLocaleString() || '0'}</div>
            <p className="text-xs text-gray-800">
              <span className="text-green-600">+12%</span> depuis le mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-950">Taux de Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-950" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-950">{metrics?.conversionRate?.toFixed(1) || '0'}%</div>
            <p className="text-xs text-gray-800">
              <span className="text-green-600">+2.1%</span> depuis le mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-950">Revenu</CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-950" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-950">{metrics?.totalRevenue?.toLocaleString() || '0'} €</div>
            <p className="text-xs text-gray-800">
              <span className="text-green-600">+18%</span> depuis le mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-950">Performance Équipe</CardTitle>
            <Users className="h-4 w-4 text-gray-950" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-950">{metrics?.teamPerformance || '0'}%</div>
            <p className="text-xs text-gray-800">
              <span className="text-green-600">+5%</span> depuis le mois dernier
            </p>
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
