'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, Users, TrendingUp, Phone, Award, ArrowUpRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getDashboardMetrics } from '@/app/actions/dashboard-metrics'
import { getRecentCallAnalyses } from '@/app/actions/call-analysis'
import { getTopPerformers } from '@/app/actions/sales-reps'
import { useUser } from '@clerk/nextjs'

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      <span className="ml-2 text-gray-600">Loading...</span>
    </div>
  )
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const [dashboardData, setDashboardData] = useState<{
    metrics: any
    recentCalls: any[]
    topPerformers: any[]
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

        const [metrics, recentCalls, topPerformers] = await Promise.all([
          getDashboardMetrics(userData.organizationId),
          getRecentCallAnalyses(userData.organizationId, 3),
          getTopPerformers(userData.organizationId, 3)
        ])

        setDashboardData({
          metrics,
          recentCalls,
          topPerformers
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
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here's your sales overview.</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here's your sales overview.</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="mb-4 text-red-600">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { metrics, recentCalls, topPerformers } = dashboardData || {}

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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-700">
            Welcome back, {user?.firstName || userData?.firstName}! Here's your sales overview.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalCalls?.toLocaleString() || '0'}</div>
            <p className="text-xs text-gray-600">
              <span className="text-green-600">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.conversionRate?.toFixed(1) || '0'}%</div>
            <p className="text-xs text-gray-600">
              <span className="text-green-600">+2.1%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics?.totalRevenue?.toLocaleString() || '0'}</div>
            <p className="text-xs text-gray-600">
              <span className="text-green-600">+18%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Performance</CardTitle>
            <Users className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.teamPerformance || '0'}%</div>
            <p className="text-xs text-gray-600">
              <span className="text-green-600">+5%</span> from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Call Analysis</CardTitle>
                <CardDescription>AI-powered insights from your recent calls</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/call-analysis">
                  View All <ArrowUpRight className="ml-2 h-4 w-4" />
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
                          {call.sentiment} sentiment
                        </p>
                        <p className={`text-xs ${palette.subtle}`}>
                          Call with {call.client}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${palette.accent}`}>{call.score}%</p>
                      <p className="text-xs text-gray-600">Score</p>
                    </div>
                  </div>
                )
              }) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No recent call analyses available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sales Ranking</CardTitle>
                <CardDescription>Top performers this month</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/sales-ranking">
                  View All <ArrowUpRight className="ml-2 h-4 w-4" />
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
                        <p className="text-sm font-medium text-white">{rep.name}</p>
                        <p className="text-xs text-slate-300/70">{rep.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${palette.accent}`}>
                        ${rep.totalRevenue?.toLocaleString() || '0'}
                      </p>
                      <p className="text-xs text-slate-300/70">{rep.dealsClosedQTD || 0} deals</p>
                    </div>
                  </div>
                )
              }) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No sales representatives available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates from your sales team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-green-200 bg-green-50">
                <Award className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Sarah Johnson closed a $5,000 deal</p>
                <p className="text-xs text-gray-600">Johnson Corp · Enterprise package</p>
                <p className="text-xs text-gray-600">2 hours ago</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Mike Chen completed call analysis</p>
                <p className="text-xs text-gray-600">TechStart Inc · 45 min call, positive sentiment</p>
                <p className="text-xs text-gray-600">4 hours ago</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-purple-400/40 bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-200" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Lisa Rodriguez improved conversion rate</p>
                <p className="text-xs text-slate-300/70">From 18% to 25% this week</p>
                <p className="text-xs text-slate-400/70">1 day ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
